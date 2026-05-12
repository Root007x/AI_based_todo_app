const express = require('express');
const cors = require('cors');
const db = require('./database');
const admin = require('firebase-admin');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK
try {
  const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Firebase Admin initialized using serviceAccountKey.json');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Firebase Admin initialized using .env FIREBASE_SERVICE_ACCOUNT_KEY');
  } else {
    console.warn('Firebase Admin credentials not found. Push notifications will be mocked.');
  }
} catch (e) {
  console.error('Failed to initialize Firebase Admin:', e);
}

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const app = express();
const PORT = process.env.PORT || 3001;

// Multer — store audio in memory (max 25MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function sendFCMToUser(userId, title, body) {
  if (!admin.apps.length) return;
  try {
    const row = await dbGet('SELECT fcm_token FROM users WHERE id = ?', [userId]);
    if (row && row.fcm_token) {
      await admin.messaging().send({ token: row.fcm_token, notification: { title, body } });
    }
  } catch (e) {
    console.error('[FCM] Failed to notify user:', e.message);
  }
}

function dbGet(sql, params) {
  return new Promise((res, rej) => db.get(sql, params, (e, row) => e ? rej(e) : res(row)));
}
function dbAll(sql, params) {
  return new Promise((res, rej) => db.all(sql, params, (e, rows) => e ? rej(e) : res(rows)));
}
function dbRun(sql, params) {
  return new Promise((res, rej) => db.run(sql, params, function(e) { e ? rej(e) : res(this); }));
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

app.post('/api/notifications/send', async (req, res) => {
  const { title, body, user_id, team_id, icon } = req.body;
  try {
    let tokens = [];
    if (team_id) {
      const rows = await dbAll(
        `SELECT u.fcm_token FROM users u JOIN team_members tm ON u.id = tm.user_id WHERE tm.team_id = ? AND u.fcm_token IS NOT NULL`,
        [team_id]
      );
      tokens = rows.map(r => r.fcm_token);
    } else if (user_id) {
      const row = await dbGet('SELECT fcm_token FROM users WHERE id = ?', [user_id]);
      if (row && row.fcm_token) tokens.push(row.fcm_token);
    }

    if (tokens.length === 0) return res.json({ success: true, message: 'No target tokens found.' });

    if (admin.apps.length > 0) {
      const response = await admin.messaging().sendEachForMulticast({
        notification: { title, body, image: icon || undefined },
        tokens,
      });
      console.log(`[FCM] Sent ${response.successCount} messages. Failed: ${response.failureCount}`);
      return res.json({ success: true, response });
    } else {
      console.log(`[Mock Push] To ${tokens.length} tokens: ${title} - ${body}`);
      return res.json({ success: true, message: 'Mock notification sent' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── USERS ────────────────────────────────────────────────────────────────────

app.get('/api/users/:email', (req, res) => {
  db.get('SELECT * FROM users WHERE email = ?', [req.params.email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) row.preferences = JSON.parse(row.preferences || '{}');
    res.json(row || null);
  });
});

app.post('/api/users', (req, res) => {
  const { id, name, email, avatar, role, team_id, preferences, fcm_token } = req.body;
  const prefsStr = JSON.stringify(preferences || {});
  db.run(
    `INSERT INTO users (id, name, email, avatar, role, team_id, preferences, fcm_token)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
     name=excluded.name, email=excluded.email, avatar=excluded.avatar,
     role=excluded.role, team_id=excluded.team_id, preferences=excluded.preferences, fcm_token=excluded.fcm_token`,
    [id, name, email, avatar, role || 'developer', team_id || null, prefsStr, fcm_token || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

// ─── TEAMS ────────────────────────────────────────────────────────────────────

app.get('/api/teams/:id', (req, res) => {
  db.get('SELECT * FROM teams WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
});

app.get('/api/teams/by-invite/:code', (req, res) => {
  db.get('SELECT * FROM teams WHERE invite_code = ?', [req.params.code], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
});

app.post('/api/teams', (req, res) => {
  const { id, name, description, owner_id, invite_code, created_at } = req.body;
  db.run(
    `INSERT INTO teams (id, name, description, owner_id, invite_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description`,
    [id, name, description, owner_id, invite_code, created_at],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

app.put('/api/teams/:id', (req, res) => {
  const { name, description } = req.body;
  db.run(`UPDATE teams SET name = ?, description = ? WHERE id = ?`, [name, description, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/teams/:id', (req, res) => {
  db.run('DELETE FROM teams WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM team_members WHERE team_id = ?', [req.params.id], () => {});
    res.json({ success: true });
  });
});

// ─── TEAM MEMBERS ─────────────────────────────────────────────────────────────

app.get('/api/teams/:team_id/members', (req, res) => {
  db.all('SELECT * FROM team_members WHERE team_id = ?', [req.params.team_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/teams/:team_id/members', (req, res) => {
  const { id, user_id, name, email, avatar, role, status, joined_at } = req.body;
  const team_id = req.params.team_id;
  db.run(
    `INSERT INTO team_members (id, user_id, team_id, name, email, avatar, role, status, joined_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, team_id) DO UPDATE SET name=excluded.name, role=excluded.role, status=excluded.status, avatar=excluded.avatar`,
    [id, user_id, team_id, name, email, avatar, role || 'member', status || 'active', joined_at],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

app.put('/api/teams/:team_id/members/:member_id', (req, res) => {
  const { role, status } = req.body;
  db.run(
    `UPDATE team_members SET role = ?, status = ? WHERE id = ? AND team_id = ?`,
    [role, status, req.params.member_id, req.params.team_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/teams/:team_id/members/:member_id', (req, res) => {
  db.run('DELETE FROM team_members WHERE id = ? AND team_id = ?', [req.params.member_id, req.params.team_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

app.get('/api/projects', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/projects', (req, res) => {
  const { id, name, description, color, created_at, due_date } = req.body;
  db.run(
    `INSERT INTO projects (id, name, description, color, created_at, due_date) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, description, color, created_at, due_date],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

app.put('/api/projects/:id', (req, res) => {
  const { name, description, color, due_date } = req.body;
  db.run(
    `UPDATE projects SET name = ?, description = ?, color = ?, due_date = ? WHERE id = ?`,
    [name, description, color, due_date, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/projects/:id', (req, res) => {
  db.run('DELETE FROM projects WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ─── TASKS ────────────────────────────────────────────────────────────────────

app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const tasks = rows.map(r => ({
      ...r,
      subtasks: JSON.parse(r.subtasks || '[]'),
      tags: JSON.parse(r.tags || '[]'),
      ai_generated: Boolean(r.ai_generated),
    }));
    res.json(tasks);
  });
});

app.post('/api/tasks', async (req, res) => {
  const { id, title, description, priority, status, due_date, project_id, assignee_id, subtasks, tags, created_at, ai_generated, created_by_name } = req.body;
  try {
    await dbRun(
      `INSERT INTO tasks (id, title, description, priority, status, due_date, project_id, assignee_id, subtasks, tags, created_at, ai_generated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, priority, status, due_date, project_id, assignee_id || null,
       JSON.stringify(subtasks || []), JSON.stringify(tags || []), created_at, ai_generated ? 1 : 0]
    );

    // FCM notification to assignee
    if (assignee_id) {
      const msg = created_by_name
        ? `${created_by_name} assigned you: "${title}"`
        : `You have been assigned a new task: "${title}"`;
      await sendFCMToUser(assignee_id, '📋 New Task Assigned', msg);
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { title, description, priority, status, due_date, project_id, assignee_id, subtasks, tags, updated_by_name } = req.body;

  const fields = [];
  const values = [];

  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (due_date !== undefined) { fields.push('due_date = ?'); values.push(due_date); }
  if (project_id !== undefined) { fields.push('project_id = ?'); values.push(project_id); }
  if (assignee_id !== undefined) { fields.push('assignee_id = ?'); values.push(assignee_id); }
  if (subtasks !== undefined) { fields.push('subtasks = ?'); values.push(JSON.stringify(subtasks)); }
  if (tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(tags)); }

  if (fields.length === 0) return res.json({ success: true });
  values.push(req.params.id);

  try {
    await dbRun(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);

    // FCM notification on status change
    if (status !== undefined) {
      const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
      if (task && task.assignee_id) {
        let notifTitle = '🔄 Task Updated';
        let notifBody = `Task "${task.title}" status changed to ${status}.`;

        if (status === 'done') {
          notifTitle = '✅ Task Completed';
          notifBody = updated_by_name
            ? `${updated_by_name} completed "${task.title}".`
            : `Task "${task.title}" has been completed.`;
        } else if (status === 'in_progress') {
          notifTitle = '🚀 Task In Progress';
          notifBody = `"${task.title}" is now in progress.`;
        }
        await sendFCMToUser(task.assignee_id, notifTitle, notifBody);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

app.get('/api/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  db.all('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?', [limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const logs = rows.map(r => ({ ...r, meta: JSON.parse(r.meta || '{}') }));
    res.json(logs);
  });
});

app.post('/api/activity', (req, res) => {
  const { id, user_id, user_name, user_avatar, action, entity_type, entity_id, entity_title, meta, created_at } = req.body;
  db.run(
    `INSERT INTO activity_logs (id, user_id, user_name, user_avatar, action, entity_type, entity_id, entity_title, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user_id, user_name, user_avatar, action, entity_type, entity_id, entity_title, JSON.stringify(meta || {}), created_at],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

// ─── VOICE INSTRUCTIONS ───────────────────────────────────────────────────────

app.get('/api/voice', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const user_id = req.query.user_id;
  const sql = user_id
    ? 'SELECT * FROM voice_instructions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    : 'SELECT * FROM voice_instructions ORDER BY created_at DESC LIMIT ?';
  const params = user_id ? [user_id, limit] : [limit];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const result = rows.map(r => ({ ...r, extracted_tasks: JSON.parse(r.extracted_tasks || '[]') }));
    res.json(result);
  });
});

/**
 * POST /api/voice/process
 * Accepts: multipart/form-data with field "audio" (audio/webm or audio/wav)
 * Also accepts: { transcript } as JSON for text-only mode
 * Returns: { transcript, tasks: [{assigned_to, task, deadline, priority}] }
 */
app.post('/api/voice/process', upload.single('audio'), async (req, res) => {
  try {
    let transcript = req.body.transcript || '';
    const teamMembers = req.body.team_members ? JSON.parse(req.body.team_members) : [];
    const currentDate = new Date().toISOString().split('T')[0];

    // ── Step 1: Speech-to-Text via Gemini (if audio uploaded) ──────────────
    if (req.file && !transcript) {
      if (!genAI) {
        return res.status(400).json({ error: 'GEMINI_API_KEY not configured. Add it to server/.env' });
      }

      const audioBase64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype || 'audio/webm';

      const sttModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const sttResult = await sttModel.generateContent([
        {
          inlineData: { data: audioBase64, mimeType },
        },
        'Transcribe this audio exactly. Return only the spoken text, nothing else.',
      ]);
      transcript = sttResult.response.text().trim();
    }

    if (!transcript) {
      return res.status(400).json({ error: 'No audio or transcript provided.' });
    }

    if (req.body.stt_only === 'true') {
      return res.json({ success: true, transcript });
    }

    // ── Step 2: AI Task Extraction via Gemini ──────────────────────────────
    let tasks = [];

    if (genAI) {
      const memberNames = teamMembers.map(m => m.name).join(', ');
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt = `You are an AI assistant that extracts structured task assignments from voice instructions.

Today's date: ${currentDate}
Team members: ${memberNames || 'Unknown'}

Voice instruction: "${transcript}"

Extract all task assignments from this instruction. Important rules:
- Speech-to-text might transcribe commands in the past tense (e.g., "designed" instead of "design" or "to design"). Even if the phrasing sounds like a past event, ALWAYS interpret it as a task assignment if a person and an action are mentioned.
- assigned_to: the person's name (must match one of the team members if provided)
- task: clear task description
- deadline: resolved to YYYY-MM-DD if possible, or descriptive like "tomorrow", "end of week"
- priority: "High", "Medium", or "Low" based on urgency cues

Return a JSON object: { "tasks": [ { "assigned_to": "string", "task": "string", "deadline": "string|null", "priority": "High"|"Medium"|"Low" } ] }

If no clear assignments found, return { "tasks": [] }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      try {
        const parsed = JSON.parse(text);
        tasks = parsed.tasks || [];
      } catch {
        // Try to extract JSON from response
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          tasks = parsed.tasks || [];
        }
      }
    } else {
      // Fallback mock extraction when no Gemini key
      tasks = [{
        assigned_to: teamMembers[0]?.name || 'Unassigned',
        task: transcript.substring(0, 80),
        deadline: null,
        priority: 'Medium',
      }];
    }

    // ── Step 3: Store voice instruction ────────────────────────────────────
    const { v4: uuidv4 } = require('uuid');
    const instructionId = uuidv4();
    const user_id = req.body.user_id || null;

    await dbRun(
      `INSERT INTO voice_instructions (id, user_id, transcript, raw_audio_name, extracted_tasks, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [instructionId, user_id, transcript, req.file?.originalname || null, JSON.stringify(tasks), 'processed', new Date().toISOString()]
    );

    res.json({ success: true, instruction_id: instructionId, transcript, tasks });
  } catch (error) {
    console.error('[Voice] Processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

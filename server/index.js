const express = require('express');
const cors = require('cors');
const db = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- USERS ---
app.get('/api/users/:email', (req, res) => {
  db.get('SELECT * FROM users WHERE email = ?', [req.params.email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      row.preferences = JSON.parse(row.preferences || '{}');
    }
    res.json(row || null);
  });
});

app.post('/api/users', (req, res) => {
  const { id, name, email, avatar, preferences } = req.body;
  const prefsStr = JSON.stringify(preferences || {});
  
  db.run(
    `INSERT INTO users (id, name, email, avatar, preferences) 
     VALUES (?, ?, ?, ?, ?) 
     ON CONFLICT(id) DO UPDATE SET 
     name=excluded.name, email=excluded.email, avatar=excluded.avatar, preferences=excluded.preferences`,
    [id, name, email, avatar, prefsStr],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

// --- PROJECTS ---
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
    function (err) {
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
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/projects/:id', (req, res) => {
  db.run('DELETE FROM projects WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- TASKS ---
app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const tasks = rows.map(r => ({
      ...r,
      subtasks: JSON.parse(r.subtasks || '[]'),
      tags: JSON.parse(r.tags || '[]'),
      ai_generated: Boolean(r.ai_generated)
    }));
    res.json(tasks);
  });
});

app.post('/api/tasks', (req, res) => {
  const { id, title, description, priority, status, due_date, project_id, subtasks, tags, created_at, ai_generated } = req.body;
  db.run(
    `INSERT INTO tasks (id, title, description, priority, status, due_date, project_id, subtasks, tags, created_at, ai_generated) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, description, priority, status, due_date, project_id, JSON.stringify(subtasks || []), JSON.stringify(tags || []), created_at, ai_generated ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

app.put('/api/tasks/:id', (req, res) => {
  const { title, description, priority, status, due_date, project_id, subtasks, tags } = req.body;
  
  // We dynamically build the query based on provided fields to support Partial<Task> updates
  const fields = [];
  const values = [];
  
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (due_date !== undefined) { fields.push('due_date = ?'); values.push(due_date); }
  if (project_id !== undefined) { fields.push('project_id = ?'); values.push(project_id); }
  if (subtasks !== undefined) { fields.push('subtasks = ?'); values.push(JSON.stringify(subtasks)); }
  if (tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(tags)); }

  if (fields.length === 0) return res.json({ success: true });

  values.push(req.params.id);
  
  db.run(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/tasks/:id', (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

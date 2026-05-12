const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

const initDb = () => {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      avatar TEXT,
      role TEXT DEFAULT 'developer',
      team_id TEXT,
      preferences TEXT
    )`);

    // Run migration: add role/team_id columns if they don't exist (safe for existing DBs)
    db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'developer'`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN team_id TEXT`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN fcm_token TEXT`, () => {});

    // Teams Table
    db.run(`CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      owner_id TEXT,
      invite_code TEXT UNIQUE,
      created_at TEXT
    )`);

    // Team Members Table
    db.run(`CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      team_id TEXT,
      name TEXT,
      email TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'active',
      joined_at TEXT,
      UNIQUE(user_id, team_id)
    )`);

    // Projects Table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      color TEXT,
      created_at TEXT,
      due_date TEXT
    )`);

    // Tasks Table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      priority TEXT,
      status TEXT,
      due_date TEXT,
      project_id TEXT,
      assignee_id TEXT,
      subtasks TEXT,
      tags TEXT,
      created_at TEXT,
      ai_generated BOOLEAN
    )`);
    
    // Migration for assignee_id
    db.run(`ALTER TABLE tasks ADD COLUMN assignee_id TEXT`, () => {});

    // Voice Instructions Table
    db.run(`CREATE TABLE IF NOT EXISTS voice_instructions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      transcript TEXT,
      raw_audio_name TEXT,
      extracted_tasks TEXT,
      status TEXT DEFAULT 'processed',
      created_at TEXT
    )`);

    // Activity Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      user_avatar TEXT,
      action TEXT,
      entity_type TEXT,
      entity_id TEXT,
      entity_title TEXT,
      meta TEXT,
      created_at TEXT
    )`);
  });
};

initDb();

module.exports = db;

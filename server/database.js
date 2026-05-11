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
      preferences TEXT
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
      subtasks TEXT,
      tags TEXT,
      created_at TEXT,
      ai_generated BOOLEAN
    )`);
  });
};

initDb();

module.exports = db;

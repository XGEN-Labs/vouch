// SQLite 数据访问层。转正换 RDS MySQL 时，只需要替换这个文件里的函数体。
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { config } from './config.js'

fs.mkdirSync(path.dirname(path.resolve(config.dbPath)), { recursive: true })

export const db = new Database(path.resolve(config.dbPath))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    invite_code   TEXT,
    created_at    TEXT NOT NULL,
    last_seen_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invites (
    code       TEXT PRIMARY KEY COLLATE NOCASE,
    max_uses   INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    note       TEXT,
    disabled   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`)

const now = () => new Date().toISOString()

/* ---------- users ---------- */

export function findUserByName(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
}

export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

export function createUser({ username, passwordHash, inviteCode }) {
  const info = db
    .prepare('INSERT INTO users (username, password_hash, invite_code, created_at) VALUES (?, ?, ?, ?)')
    .run(username, passwordHash, inviteCode || null, now())
  return findUserById(info.lastInsertRowid)
}

export function touchUser(id) {
  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now(), id)
}

export function countUsers() {
  return db.prepare('SELECT COUNT(*) AS n FROM users').get().n
}

/* ---------- profiles ---------- */

export function getProfile(userId) {
  const row = db.prepare('SELECT data, updated_at FROM profiles WHERE user_id = ?').get(userId)
  if (!row) return null
  try {
    return { data: JSON.parse(row.data), updatedAt: row.updated_at }
  } catch {
    return null
  }
}

export function saveProfile(userId, data) {
  const updatedAt = now()
  db.prepare(
    `INSERT INTO profiles (user_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).run(userId, JSON.stringify(data), updatedAt)
  return { data, updatedAt }
}

export function deleteProfile(userId) {
  db.prepare('DELETE FROM profiles WHERE user_id = ?').run(userId)
}

/* ---------- invites ---------- */

export function createInvite({ code, maxUses = 1, note = null }) {
  db.prepare('INSERT INTO invites (code, max_uses, note, created_at) VALUES (?, ?, ?, ?)')
    .run(code, maxUses, note, now())
  return db.prepare('SELECT * FROM invites WHERE code = ?').get(code)
}

export function listInvites() {
  return db.prepare('SELECT * FROM invites ORDER BY created_at DESC').all()
}

export function setInviteDisabled(code, disabled) {
  return db.prepare('UPDATE invites SET disabled = ? WHERE code = ?').run(disabled ? 1 : 0, code).changes
}

/**
 * 原子地校验并占用一个邀请码名额。返回 true 表示占用成功。
 * 用条件 UPDATE 而不是先查后写，避免两个人同时用最后一个名额。
 */
export function consumeInvite(code) {
  const res = db
    .prepare(
      `UPDATE invites SET used_count = used_count + 1
       WHERE code = ? AND disabled = 0 AND used_count < max_uses`
    )
    .run(code)
  return res.changes === 1
}

export function releaseInvite(code) {
  db.prepare('UPDATE invites SET used_count = MAX(used_count - 1, 0) WHERE code = ?').run(code)
}

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

// Connection
const dataDir = path.join(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'chat.db'));


// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

//  Schema — runs on every startup, idempotent
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender          TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
    text            TEXT NOT NULL,
    timestamp       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, timestamp);

  CREATE TABLE IF NOT EXISTS knowledge_base (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Synchronize FAQ settings from backend/data/policies.json on startup
const policiesPath = path.join(__dirname, '../data/policies.json');
if (fs.existsSync(policiesPath)) {
  try {
    const rawData = fs.readFileSync(policiesPath, 'utf8');
    const policies = JSON.parse(rawData) as Record<string, any>;

    const upsertKb = db.prepare('INSERT OR REPLACE INTO knowledge_base (key, value) VALUES (?, ?)');
    const transaction = db.transaction((entries: [string, string][]) => {
      for (const [k, v] of entries) {
        upsertKb.run(k, v);
      }
    });

    const mappedEntries = Object.entries(policies).map(([k, v]) => {
      const stringValue = typeof v === 'string' ? v : JSON.stringify(v);
      return [k, stringValue] as [string, string];
    });

    transaction(mappedEntries);
    console.log('[db] Synchronized policies from policies.json.');
  } catch (err) {
    console.error('[db] Failed to parse/sync policies.json:', err);
  }
}

// Types
export interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

// Query functions

/** Create a new conversation and return its id. */
export function createConversation(): string {
  const id = nanoid();
  db.prepare('INSERT INTO conversations (id) VALUES (?)').run(id);
  return id;
}

/** Check whether a conversation id already exists. */
export function conversationExists(id: string): boolean {
  return !!db.prepare('SELECT 1 FROM conversations WHERE id = ?').get(id);
}

/** Persist a single message (user or ai) to the database. */
export function insertMessage(
  conversationId: string,
  sender: 'user' | 'ai',
  text: string
): void {
  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender, text)
     VALUES (?, ?, ?, ?)`
  ).run(nanoid(), conversationId, sender, text);
}

/**
 * Fetch the most recent N messages for a conversation,
 * returned in chronological order (oldest first).
 */
export function getRecentMessages(
  conversationId: string,
  limit = 10
): Pick<Message, 'sender' | 'text'>[] {
  return db
    .prepare(
      `SELECT sender, text
       FROM messages
       WHERE conversation_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(conversationId, limit)
    .reverse() as Pick<Message, 'sender' | 'text'>[];
}

/**
 * Fetch the full message history for a conversation.
 * Used by GET /chat/history/:sessionId to restore the UI.
 */
export function getFullHistory(conversationId: string): Message[] {
  return db
    .prepare(
      `SELECT id, conversation_id, sender, text, timestamp
       FROM messages
       WHERE conversation_id = ?
       ORDER BY timestamp ASC`
    )
    .all(conversationId) as Message[];
}

export interface KnowledgeItem {
  key: string;
  value: string;
}

/**
 * Fetch all domain settings from the knowledge base.
 */
export function getKnowledgeBase(): KnowledgeItem[] {
  return db.prepare('SELECT key, value FROM knowledge_base').all() as KnowledgeItem[];
}

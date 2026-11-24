CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('student','teacher')),
  admin_pass_hash TEXT NOT NULL,
  admin_auth_ver INTEGER NOT NULL DEFAULT 1,
  owner_user_id INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','drawn')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  drawn_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  login TEXT NOT NULL,
  contact TEXT NOT NULL,
  full_name TEXT NOT NULL,
  group_or_position TEXT NOT NULL DEFAULT '',
  wish TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  alternative TEXT NOT NULL DEFAULT '',
  pass_hash TEXT NOT NULL,
  must_change_pass INTEGER NOT NULL DEFAULT 0,
  auth_ver INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (room_id, login)
);

CREATE TABLE IF NOT EXISTS pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  giver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (room_id, giver_id),
  UNIQUE (room_id, receiver_id),
  CHECK (giver_id <> receiver_id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket TEXT NOT NULL,
  ident TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rl ON rate_limits(bucket, ident, created_at);
CREATE INDEX IF NOT EXISTS idx_users_room ON users(room_id);
CREATE TABLE IF NOT EXISTS rooms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  type ENUM('student','teacher') NOT NULL,
  admin_pass_hash VARCHAR(255) NOT NULL,
  admin_auth_ver INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('open','drawn') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  drawn_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id INT UNSIGNED NOT NULL,
  login VARCHAR(64) NOT NULL,
  contact VARCHAR(64) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  group_or_position VARCHAR(100) NOT NULL DEFAULT '',
  wish TEXT NOT NULL,
  link VARCHAR(500) NOT NULL DEFAULT '',
  alternative VARCHAR(500) NOT NULL DEFAULT '',
  pass_hash VARCHAR(255) NOT NULL,
  must_change_pass TINYINT(1) NOT NULL DEFAULT 0,
  auth_ver INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_room_login (room_id, login),
  KEY idx_users_room (room_id),
  CONSTRAINT fk_users_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pairs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id INT UNSIGNED NOT NULL,
  giver_id INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pairs_giver (room_id, giver_id),
  UNIQUE KEY uq_pairs_receiver (room_id, receiver_id),
  CONSTRAINT fk_pairs_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_pairs_giver FOREIGN KEY (giver_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pairs_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_pairs_self CHECK (giver_id <> receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  bucket VARCHAR(32) NOT NULL,
  ident VARCHAR(64) NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_rl (bucket, ident, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- VHS Tapes Table
CREATE TABLE IF NOT EXISTS vhs_tapes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    movie_id TEXT NOT NULL,
    movie_title TEXT NOT NULL,
    movie_year INTEGER,
    cover_art_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_token ON vhs_tapes(token);

-- Scan History Table (optional - track when tapes are scanned)
CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tape_id INTEGER NOT NULL,
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tape_id) REFERENCES vhs_tapes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scan_history_tape_id ON scan_history(tape_id);

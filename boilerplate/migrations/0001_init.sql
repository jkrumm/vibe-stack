-- Your app's data lives here.
-- Every change to the schema is a NEW numbered migration file (0002_*.sql, 0003_*.sql, ...).
-- Never edit a migration that has already been applied.

CREATE TABLE IF NOT EXISTS entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  amount      REAL,                 -- optional number (e.g. calories, count, weight) — the chart plots this
  note        TEXT,                 -- optional free text
  photo_key   TEXT,                 -- optional: the R2 object key. The image itself lives in R2, not here.
  created_at  TEXT    NOT NULL      -- ISO 8601 timestamp, e.g. 2026-06-01T10:30:00.000Z
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries (created_at);

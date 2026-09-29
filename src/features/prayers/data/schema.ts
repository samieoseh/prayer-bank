import type { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 1;

export async function migratePrayerDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = versionRow?.user_version ?? 0;

  if (version > SCHEMA_VERSION) {
    throw new Error('Prayer database version is newer than this app supports.');
  }

  if (version === SCHEMA_VERSION) return;

  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (id, user_id)
      );

      CREATE TABLE IF NOT EXISTS prayer_requests (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        title TEXT NOT NULL,
        details TEXT,
        status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id, user_id)
          REFERENCES categories (id, user_id)
          ON UPDATE RESTRICT
          ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_categories_owner
        ON categories (user_id, updated_at DESC, id);
      CREATE INDEX IF NOT EXISTS idx_prayer_requests_owner_status
        ON prayer_requests (user_id, status, updated_at DESC, id);

      PRAGMA user_version = 1;
    `);
  });
}

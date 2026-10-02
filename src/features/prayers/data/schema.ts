import type { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 4;

export async function migratePrayerDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = versionRow?.user_version ?? 0;

  if (version > SCHEMA_VERSION) {
    throw new Error('Prayer database version is newer than this app supports.');
  }

  if (version === SCHEMA_VERSION) return;

  await db.withExclusiveTransactionAsync(async (transaction) => {
    if (version === 0) {
      await transaction.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (sync_status IN ('pending', 'synced', 'failed')),
          UNIQUE (id, user_id)
        );

        CREATE TABLE IF NOT EXISTS prayer_requests (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          title TEXT NOT NULL,
          details TEXT,
          schedule_type TEXT CHECK (
            schedule_type IS NULL OR schedule_type IN ('daily', 'weekly', 'selectedDays')
          ),
          scheduled_days TEXT,
          status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'answered')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (sync_status IN ('pending', 'synced', 'failed')),
          FOREIGN KEY (category_id, user_id)
            REFERENCES categories (id, user_id)
            ON UPDATE RESTRICT
            ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS idx_categories_owner
          ON categories (user_id, updated_at DESC, id);
        CREATE INDEX IF NOT EXISTS idx_prayer_requests_owner_status
          ON prayer_requests (user_id, status, updated_at DESC, id);

        CREATE TABLE IF NOT EXISTS answer_records (
          id TEXT PRIMARY KEY NOT NULL,
          prayer_request_id TEXT NOT NULL UNIQUE,
          answered_on TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (sync_status IN ('pending', 'synced', 'failed')),
          FOREIGN KEY (prayer_request_id)
            REFERENCES prayer_requests (id)
            ON UPDATE RESTRICT
            ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_answer_records_answered_on
          ON answer_records (answered_on DESC, prayer_request_id);
      `);
    }

    if (version > 0 && version < 4) {
      await transaction.execAsync(`
        ALTER TABLE categories
          ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (sync_status IN ('pending', 'synced', 'failed'));
      `);
    }

    if (version === 3) {
      await transaction.execAsync(`
        ALTER TABLE prayer_requests
          ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (sync_status IN ('pending', 'synced', 'failed'));
        ALTER TABLE answer_records
          ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (sync_status IN ('pending', 'synced', 'failed'));
      `);
    }

    await transaction.execAsync(`
      CREATE TABLE IF NOT EXISTS prayer_sync_metadata (
        singleton INTEGER PRIMARY KEY NOT NULL DEFAULT 1 CHECK (singleton = 1),
        legacy_owner_claimed_by TEXT,
        last_attempt_at TEXT,
        last_success_at TEXT
      );

      INSERT OR IGNORE INTO prayer_sync_metadata (singleton) VALUES (1);

      CREATE INDEX IF NOT EXISTS idx_categories_owner_sync
        ON categories (user_id, sync_status, updated_at, id);
    `);

    if (version === 1) {
      await transaction.execAsync(`
        ALTER TABLE prayer_requests
          ADD COLUMN schedule_type TEXT CHECK (
            schedule_type IS NULL OR schedule_type IN ('daily', 'weekly', 'selectedDays')
          );
        ALTER TABLE prayer_requests ADD COLUMN scheduled_days TEXT;
      `);
    }

    if (version === 1 || version === 2) {
      await transaction.execAsync(`
        CREATE TABLE prayer_requests_next (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          title TEXT NOT NULL,
          details TEXT,
          schedule_type TEXT CHECK (
            schedule_type IS NULL OR schedule_type IN ('daily', 'weekly', 'selectedDays')
          ),
          scheduled_days TEXT,
          status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'answered')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (sync_status IN ('pending', 'synced', 'failed')),
          FOREIGN KEY (category_id, user_id)
            REFERENCES categories (id, user_id)
            ON UPDATE RESTRICT
            ON DELETE RESTRICT
        );

        INSERT INTO prayer_requests_next
          (id, user_id, category_id, title, details, schedule_type, scheduled_days, status, created_at, updated_at)
        SELECT id, user_id, category_id, title, details, schedule_type, scheduled_days, status, created_at, updated_at
        FROM prayer_requests;

        DROP TABLE prayer_requests;
        ALTER TABLE prayer_requests_next RENAME TO prayer_requests;

        CREATE INDEX idx_prayer_requests_owner_status
          ON prayer_requests (user_id, status, updated_at DESC, id);

        CREATE TABLE answer_records (
          id TEXT PRIMARY KEY NOT NULL,
          prayer_request_id TEXT NOT NULL UNIQUE,
          answered_on TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'pending'
            CHECK (sync_status IN ('pending', 'synced', 'failed')),
          FOREIGN KEY (prayer_request_id)
            REFERENCES prayer_requests (id)
            ON UPDATE RESTRICT
            ON DELETE CASCADE
        );

        CREATE INDEX idx_answer_records_answered_on
          ON answer_records (answered_on DESC, prayer_request_id);
      `);
    }

    await transaction.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_prayer_requests_owner_sync
        ON prayer_requests (user_id, sync_status, updated_at, id);
      CREATE INDEX IF NOT EXISTS idx_answer_records_sync
        ON answer_records (sync_status, updated_at, prayer_request_id);
    `);

    await transaction.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  });
}

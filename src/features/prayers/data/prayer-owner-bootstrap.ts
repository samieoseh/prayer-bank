import type { SQLiteDatabase } from 'expo-sqlite';

export const LOCAL_DEVICE_OWNER_ID = 'local-device';

export async function claimLegacyPrayerOwner(db: SQLiteDatabase, ownerId: string) {
  const normalizedOwnerId = ownerId.trim();
  if (!normalizedOwnerId || normalizedOwnerId === LOCAL_DEVICE_OWNER_ID) {
    throw new Error('Authenticated prayer owner is invalid.');
  }

  await db.withExclusiveTransactionAsync(async (transaction) => {
    const metadata = await transaction.getFirstAsync<{ legacy_owner_claimed_by: string | null }>(
      `SELECT legacy_owner_claimed_by
       FROM prayer_sync_metadata
       WHERE singleton = 1`,
    );

    if (!metadata) throw new Error('Prayer synchronization metadata is unavailable.');
    if (metadata.legacy_owner_claimed_by) return;

    await transaction.execAsync('PRAGMA defer_foreign_keys = ON;');
    await transaction.runAsync(
      `UPDATE categories
       SET user_id = ?, sync_status = 'pending'
       WHERE user_id = ?`,
      normalizedOwnerId,
      LOCAL_DEVICE_OWNER_ID,
    );
    await transaction.runAsync(
      `UPDATE prayer_requests
       SET user_id = ?, sync_status = 'pending'
       WHERE user_id = ?`,
      normalizedOwnerId,
      LOCAL_DEVICE_OWNER_ID,
    );
    await transaction.runAsync(
      `UPDATE prayer_sync_metadata
       SET legacy_owner_claimed_by = ?
       WHERE singleton = 1 AND legacy_owner_claimed_by IS NULL`,
      normalizedOwnerId,
    );
  });
}

/**
 * Temporary photo storage utilities for ID and selfie images
 * Photos are stored VERY briefly on disk during processing, then immediately deleted
 * All photos are deleted after processing completes (success or failure)
 *
 * Crash safety: a startup sweep + periodic sweep delete any orphaned files older
 * than ORPHAN_MAX_AGE_MS that survived a crash before normal deletion ran.
 */

import fs from 'fs/promises';
import path from 'path';

const STORAGE_DIR = process.env.PHOTO_STORAGE_DIR || './storage/photos';
const ORPHAN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;  // sweep every 5 minutes

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directory:', error);
  }
}

/**
 * Save ID photo to local storage
 * @param sessionId Verification session ID
 * @param base64Data Base64 encoded image data
 * @returns Path to saved photo
 */
export async function saveIdPhoto(sessionId: string, base64Data: string): Promise<string> {
  await ensureStorageDir();
  
  const filename = `${sessionId}_id.jpg`;
  const filepath = path.join(STORAGE_DIR, filename);
  
  const buffer = Buffer.from(base64Data, 'base64');
  await fs.writeFile(filepath, buffer);
  
  return filepath;
}

/**
 * Save selfie photo to local storage
 * @param sessionId Verification session ID
 * @param base64Data Base64 encoded image data
 * @returns Path to saved photo
 */
export async function saveSelfiePhoto(sessionId: string, base64Data: string): Promise<string> {
  await ensureStorageDir();
  
  const filename = `${sessionId}_selfie.jpg`;
  const filepath = path.join(STORAGE_DIR, filename);
  
  const buffer = Buffer.from(base64Data, 'base64');
  await fs.writeFile(filepath, buffer);
  
  return filepath;
}

/**
 * Read photo from storage
 * @param filepath Path to photo
 * @returns Base64 encoded image data
 */
export async function readPhoto(filepath: string): Promise<string> {
  const buffer = await fs.readFile(filepath);
  return buffer.toString('base64');
}

/**
 * Delete a specific photo file
 * @param filepath Path to photo file
 */
export async function deletePhoto(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
    console.log(`[Photo Storage] Deleted: ${filepath}`);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[Photo Storage] Error deleting photo:', error);
    }
  }
}

/**
 * Delete photos for a session
 * @param sessionId Verification session ID
 */
export async function deleteSessionPhotos(sessionId: string): Promise<void> {
  try {
    const idPath = path.join(STORAGE_DIR, `${sessionId}_id.jpg`);
    const selfiePath = path.join(STORAGE_DIR, `${sessionId}_selfie.jpg`);

    await Promise.all([
      deletePhoto(idPath),
      deletePhoto(selfiePath),
    ]);
  } catch (error) {
    console.error('[Photo Storage] Error deleting session photos:', error);
  }
}

/**
 * Delete all files in STORAGE_DIR older than ORPHAN_MAX_AGE_MS.
 * Handles files left behind by a server crash before normal deletion ran.
 * Returns the number of files deleted.
 */
export async function sweepOrphanedPhotos(): Promise<number> {
  let deleted = 0;
  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);
    const cutoff = Date.now() - ORPHAN_MAX_AGE_MS;

    await Promise.all(
      files.map(async (file) => {
        const filepath = path.join(STORAGE_DIR, file);
        try {
          const stat = await fs.stat(filepath);
          if (stat.mtimeMs < cutoff) {
            await fs.unlink(filepath);
            console.log(`[Photo Storage] Swept orphaned file: ${filepath}`);
            deleted++;
          }
        } catch {
          // file may have been deleted between readdir and stat — ignore
        }
      })
    );
  } catch (error) {
    console.error('[Photo Storage] Error during orphan sweep:', error);
  }
  return deleted;
}

// ── Startup sweep + periodic background sweep ─────────────────────────────────
// Runs automatically when this module is first imported on the server.
// Cleans up any orphaned photos from a prior crash, then repeats on an interval.
sweepOrphanedPhotos().then((n) => {
  if (n > 0) console.log(`[Photo Storage] Startup sweep: deleted ${n} orphaned file(s)`);
});

setInterval(() => {
  sweepOrphanedPhotos().catch((err) =>
    console.error('[Photo Storage] Periodic sweep error:', err)
  );
}, SWEEP_INTERVAL_MS).unref(); // .unref() so the interval doesn't prevent process exit

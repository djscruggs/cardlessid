/**
 * Photo storage utilities for ID and selfie images
 * Stores photos locally on the server filesystem
 */

import fs from 'fs/promises';
import path from 'path';

const STORAGE_DIR = process.env.PHOTO_STORAGE_DIR || './storage/photos';

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
 * Delete photos for a session
 * @param sessionId Verification session ID
 */
export async function deleteSessionPhotos(sessionId: string): Promise<void> {
  try {
    const idPath = path.join(STORAGE_DIR, `${sessionId}_id.jpg`);
    const selfiePath = path.join(STORAGE_DIR, `${sessionId}_selfie.jpg`);
    
    await Promise.all([
      fs.unlink(idPath).catch(() => {}),
      fs.unlink(selfiePath).catch(() => {}),
    ]);
  } catch (error) {
    console.error('Error deleting session photos:', error);
  }
}



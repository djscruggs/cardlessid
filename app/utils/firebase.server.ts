import { getDatabase, ref, get, set, push } from "firebase/database";
import { firebaseApp } from "~/firebase.config";

const db = getDatabase(firebaseApp);

// Types
export interface Verification {
  verifiedAt: number;
  credentialIssued: boolean;
  compositeHash?: string; // For duplicate detection
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: number;
}

/**
 * Production verification storage
 * Path: /verifications/{walletAddress}
 */
export async function saveVerification(
  walletAddress: string,
  credentialIssued: boolean = false
): Promise<void> {
  const verificationRef = ref(db, `verifications/${walletAddress}`);
  const verification: Verification = {
    verifiedAt: Date.now(),
    credentialIssued,
  };
  await set(verificationRef, verification);
}

export async function getVerification(
  walletAddress: string
): Promise<Verification | null> {
  const verificationRef = ref(db, `verifications/${walletAddress}`);
  const snapshot = await get(verificationRef);
  return snapshot.exists() ? snapshot.val() : null;
}

export async function updateCredentialIssued(
  walletAddress: string,
  compositeHash: string
): Promise<void> {
  const verificationRef = ref(db, `verifications/${walletAddress}`);
  const snapshot = await get(verificationRef);

  if (snapshot.exists()) {
    const verification = snapshot.val();
    verification.credentialIssued = true;
    verification.compositeHash = compositeHash;
    await set(verificationRef, verification);
  }
}

/**
 * Check if a composite hash already exists (duplicate detection)
 */
export async function checkDuplicateCredential(
  compositeHash: string
): Promise<boolean> {
  const verificationsRef = ref(db, 'verifications');
  const snapshot = await get(verificationsRef);

  if (!snapshot.exists()) {
    return false;
  }

  let isDuplicate = false;
  snapshot.forEach((child) => {
    const verification = child.val();
    if (verification.compositeHash === compositeHash) {
      isDuplicate = true;
    }
  });

  return isDuplicate;
}

/**
 * Announcements storage
 * Path: /announcements/{id}
 */
export async function createAnnouncement(
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'critical' = 'info'
): Promise<string> {
  const announcementsRef = ref(db, 'announcements');
  const newAnnouncementRef = push(announcementsRef);

  const announcement = {
    title,
    message,
    severity,
    createdAt: Date.now(),
  };

  await set(newAnnouncementRef, announcement);
  return newAnnouncementRef.key!;
}

export async function getAnnouncements(limit: number = 10): Promise<Announcement[]> {
  const announcementsRef = ref(db, 'announcements');
  const snapshot = await get(announcementsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const announcements: Announcement[] = [];
  snapshot.forEach((child) => {
    announcements.push({
      id: child.key!,
      ...child.val(),
    });
  });

  // Sort by createdAt descending, limit results
  return announcements
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/**
 * Demo storage (unchanged)
 * Path: /{vid}
 * This maintains backward compatibility with existing demo
 */
export async function saveDemoVerification(
  vid: string,
  verified: boolean
): Promise<void> {
  const demoRef = ref(db, vid);
  await set(demoRef, { verified });
}

export async function getDemoVerification(vid: string): Promise<{ verified: boolean } | null> {
  const demoRef = ref(db, vid);
  const snapshot = await get(demoRef);
  return snapshot.exists() ? snapshot.val() : null;
}

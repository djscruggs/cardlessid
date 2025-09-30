import admin from "firebase-admin";

// Initialize Firebase Admin SDK
// Uses environment variables or service account file
let app: admin.app.App;

try {
  // Try to get existing app
  app = admin.app();
} catch (error) {
  // App doesn't exist, initialize it
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is required");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://cardlessid-default-rtdb.firebaseio.com",
  });
}

const db = app.database();

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
  severity: "info" | "warning" | "critical";
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
  const verificationRef = db.ref(`verifications/${walletAddress}`);
  const verification: Verification = {
    verifiedAt: Date.now(),
    credentialIssued,
  };
  await verificationRef.set(verification);
}

export async function getVerification(
  walletAddress: string
): Promise<Verification | null> {
  const verificationRef = db.ref(`verifications/${walletAddress}`);
  const snapshot = await verificationRef.get();
  return snapshot.exists() ? snapshot.val() : null;
}

export async function updateCredentialIssued(
  walletAddress: string,
  compositeHash: string
): Promise<void> {
  const verificationRef = db.ref(`verifications/${walletAddress}`);
  const snapshot = await verificationRef.get();

  if (snapshot.exists()) {
    const verification = snapshot.val();
    verification.credentialIssued = true;
    verification.compositeHash = compositeHash;
    await verificationRef.set(verification);
  }
}

/**
 * Check if a composite hash already exists (duplicate detection)
 */
export async function checkDuplicateCredential(
  compositeHash: string
): Promise<boolean> {
  const verificationsRef = db.ref("verifications");
  const snapshot = await verificationsRef.get();

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
  severity: "info" | "warning" | "critical" = "info"
): Promise<string> {
  const announcementsRef = db.ref("announcements");
  const newAnnouncementRef = announcementsRef.push();

  const announcement = {
    title,
    message,
    severity,
    createdAt: Date.now(),
  };

  await newAnnouncementRef.set(announcement);
  return newAnnouncementRef.key!;
}

export async function getAnnouncements(
  limit: number = 10
): Promise<Announcement[]> {
  const announcementsRef = db.ref("announcements");
  const snapshot = await announcementsRef.get();

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
  const demoRef = db.ref(vid);
  await demoRef.set({ verified });
}

export async function getDemoVerification(
  vid: string
): Promise<{ verified: boolean } | null> {
  const demoRef = db.ref(vid);
  const snapshot = await demoRef.get();
  return snapshot.exists() ? snapshot.val() : null;
}

/**
 * Composite Hash Generation
 * Creates a unique hash from identity data to prevent duplicate credentials
 */

import { createHash } from 'crypto';

/**
 * Generate a composite hash from identity data
 * This creates a unique identifier for a person based on their core identity attributes
 *
 * @param firstName - Person's first name
 * @param lastName - Person's last name
 * @param dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns SHA-256 hash as hex string
 */
export function generateCompositeHash(
  firstName: string,
  lastName: string,
  dateOfBirth: string
): string {
  // Normalize inputs to prevent hash mismatches from spacing/casing differences
  const normalizedFirst = firstName.trim().toLowerCase();
  const normalizedLast = lastName.trim().toLowerCase();
  const normalizedDob = dateOfBirth.trim();

  // Create deterministic string (order matters for consistency)
  const compositeString = `${normalizedFirst}|${normalizedLast}|${normalizedDob}`;

  // Generate SHA-256 hash
  const hash = createHash('sha256');
  hash.update(compositeString);

  return hash.digest('hex');
}

/**
 * Verify if a composite hash matches the provided identity data
 *
 * @param hash - The composite hash to verify
 * @param firstName - Person's first name
 * @param lastName - Person's last name
 * @param dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns true if hash matches the identity data
 */
export function verifyCompositeHash(
  hash: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string
): boolean {
  const expectedHash = generateCompositeHash(firstName, lastName, dateOfBirth);
  return hash === expectedHash;
}

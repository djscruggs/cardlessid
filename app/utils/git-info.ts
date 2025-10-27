/**
 * Git Information Utilities
 *
 * Provides access to build-time git information embedded in the application.
 * These values are captured during the build process via environment variables.
 */

/**
 * Get the git commit hash of the build
 * @returns The commit hash or 'development' if not available
 */
export function getCommitHash(): string {
  return import.meta.env.VITE_COMMIT_HASH || 'development';
}

/**
 * Get the git repository owner (user or organization)
 * @returns The repository owner or empty string if not available
 */
export function getRepoOwner(): string {
  return import.meta.env.VITE_GIT_REPO_OWNER || '';
}

/**
 * Get the git repository name
 * @returns The repository slug/name or empty string if not available
 */
export function getRepoSlug(): string {
  return import.meta.env.VITE_GIT_REPO_SLUG || '';
}

/**
 * Construct the full GitHub commit URL
 * @returns The GitHub commit URL or null if git info is not available
 */
export function getCommitUrl(): string | null {
  const hash = getCommitHash();
  const owner = getRepoOwner();
  const slug = getRepoSlug();

  // Return null if we're in development mode or missing git info
  if (hash === 'development' || !owner || !slug) {
    return null;
  }

  return `https://github.com/${owner}/${slug}/commit/${hash}`;
}

/**
 * Get the service endpoint object for W3C credentials
 * @returns Service endpoint object or null if not available
 */
export function getSystemAttestationService() {
  const commitUrl = getCommitUrl();

  if (!commitUrl) {
    return null;
  }

  return {
    id: "#system-attestation",
    type: "ZkProofSystemVersion",
    serviceEndpoint: commitUrl
  };
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMMIT_HASH: string
  readonly VITE_GIT_REPO_OWNER: string
  readonly VITE_GIT_REPO_SLUG: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
  readonly VITE_WORLDCOIN_APP_ID: string
  readonly VITE_WORLDCOIN_ACTION: string
  readonly VITE_ALGORAND_NETWORK: string
  readonly VITE_ALGORAND_INDEXER_SERVER: string
  readonly VITE_ALGORAND_INDEXER_PORT: string
  readonly VITE_AWS_REGION: string
  readonly VITE_AWS_ACCESS_KEY_ID: string
  readonly VITE_AWS_SECRET_ACCESS_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

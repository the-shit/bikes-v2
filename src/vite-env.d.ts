/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GIT_SHA?: string;
  /** Interim default `/api/feedback`. Point at Asgard intake when it exists. */
  readonly VITE_FEEDBACK_URL?: string;
}

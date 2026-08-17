/**
 * Ownership: deploy/build identity for snapshots.
 * Talks via: Vite env. Do not import gameplay systems.
 * Budget: keep this file under ~300 lines.
 */

export function currentBuildId(): string {
  const sha = import.meta.env.VITE_GIT_SHA;
  if (typeof sha === 'string' && sha.length > 0) {
    return sha;
  }
  return 'dev';
}

const CHUNK_RELOAD_STORAGE_KEY = "reage:chunk-reload";
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

type ChunkReloadState = {
  path: string;
  attemptedAt: number;
};

function readChunkReloadState(): ChunkReloadState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChunkReloadState;
  } catch {
    return null;
  }
}

function writeChunkReloadState() {
  if (typeof window === "undefined") return;

  const payload: ChunkReloadState = {
    path: `${window.location.pathname}${window.location.search}`,
    attemptedAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(
      CHUNK_RELOAD_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // Ignore sessionStorage failures and fall back to a normal reload.
  }
}

export function isChunkLoadError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("ChunkLoadError") ||
    message.includes("Unable to preload CSS")
  );
}

export function attemptChunkLoadRecovery(error: unknown) {
  if (typeof window === "undefined") return false;
  if (!isChunkLoadError(error)) return false;

  const previousAttempt = readChunkReloadState();
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (
    previousAttempt?.path === currentPath &&
    Date.now() - previousAttempt.attemptedAt < CHUNK_RELOAD_COOLDOWN_MS
  ) {
    return false;
  }

  writeChunkReloadState();
  window.location.reload();
  return true;
}

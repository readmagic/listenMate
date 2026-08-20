const RETRYABLE_DB_ERROR_PATTERNS = ["database is locked", "another row available"];
let writeQueue: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return RETRYABLE_DB_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function runWithDbRetry<T>(
  operation: () => Promise<T>,
  options?: {
    attempts?: number;
    initialDelayMs?: number;
    waitForSync?: boolean;
  },
): Promise<T> {
  const attempts = options?.attempts ?? 5;
  const initialDelayMs = options?.initialDelayMs ?? 80;
  let lastError: unknown;

  const run = async (): Promise<T> => {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!isRetryableDbError(error) || attempt === attempts) {
          throw error;
        }
        await sleep(initialDelayMs * attempt);
      }
    }
    throw lastError;
  };

  const queuedRun = writeQueue.then(run, run);
  writeQueue = queuedRun.then(
    () => undefined,
    () => undefined,
  );
  return queuedRun;
}

export async function runSerializedDbTask<T>(operation: () => Promise<T>): Promise<T> {
  const queuedRun = writeQueue.then(operation, operation);
  writeQueue = queuedRun.then(
    () => undefined,
    () => undefined,
  );
  return queuedRun;
}

/**
 * TauriPlatformService — IPlatformService implementation for Tauri v2 desktop.
 *
 * Wraps @tauri-apps/plugin-fs, @tauri-apps/plugin-sql, @tauri-apps/plugin-dialog,
 * and @tauri-apps/api behind the core platform interface.
 *
 * All Tauri imports are dynamic so the module graph stays clean in SSR/test contexts.
 */
import type {
  FetchOptions,
  FilePickerOptions,
  IDatabase,
  IPlatformService,
  IWebSocket,
  WebSocketOptions,
} from "@listenmate/core/services";

/** Adapter: wraps Tauri SQL plugin instance as IDatabase */
function isClosedPoolError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("closed pool") || message.includes("attempted to acquire a connection");
}

/** Adapter: wraps Tauri SQL plugin instance as IDatabase */
function wrapTauriDatabase(tauriDb: any, normalizedPath: string): IDatabase {
  let currentDb = tauriDb;
  let reopenPromise: Promise<void> | null = null;

  const reopenIfNeeded = async (): Promise<void> => {
    if (!reopenPromise) {
      reopenPromise = (async () => {
        const Database = (await import("@tauri-apps/plugin-sql")).default;
        currentDb = await Database.load(normalizedPath);
      })().finally(() => {
        reopenPromise = null;
      });
    }

    await reopenPromise;
  };

  const withRecovery = async <T>(operation: (db: any) => Promise<T>): Promise<T> => {
    try {
      return await operation(currentDb);
    } catch (error) {
      if (!isClosedPoolError(error)) {
        throw error;
      }

      console.warn(`[TauriPlatformService] Reopening closed SQL pool for ${normalizedPath}`);
      await reopenIfNeeded();
      return operation(currentDb);
    }
  };

  return {
    execute: (sql: string, params?: unknown[]) =>
      withRecovery((db) => db.execute(sql, params ?? [])),
    select: <T>(sql: string, params?: unknown[]): Promise<T[]> =>
      withRecovery((db) => db.select(sql, params ?? [])),
    close: () => currentDb.close(),
  };
}

export class TauriPlatformService implements IPlatformService {
  readonly platformType = "desktop" as const;
  readonly isMobile = false;
  readonly isDesktop = true;

  // ---- File system ----

  async readFile(path: string): Promise<Uint8Array> {
    const { readFile } = await import("@tauri-apps/plugin-fs");
    return readFile(path);
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(path, data);
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(path, content);
  }

  async readTextFile(path: string): Promise<string> {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    return readTextFile(path);
  }

  async mkdir(path: string): Promise<void> {
    const { mkdir } = await import("@tauri-apps/plugin-fs");
    await mkdir(path, { recursive: true });
  }

  async exists(path: string): Promise<boolean> {
    const { exists } = await import("@tauri-apps/plugin-fs");
    return exists(path);
  }

  async deleteFile(path: string): Promise<void> {
    const { remove } = await import("@tauri-apps/plugin-fs");
    await remove(path);
  }

  async getAppDataDir(): Promise<string> {
    const { appDataDir } = await import("@tauri-apps/api/path");
    return appDataDir();
  }

  async getDataDir(): Promise<string> {
    // Desktop: user-configurable library root (defaults to appDataDir if not customised)
    const { getDesktopLibraryRoot } = await import("@/lib/storage/desktop-library-root");
    return getDesktopLibraryRoot();
  }

  async joinPath(...parts: string[]): Promise<string> {
    const { join } = await import("@tauri-apps/api/path");
    return join(...parts);
  }

  convertFileSrc(path: string): string {
    // Dynamic import can't be used for a synchronous method.
    // Use the Tauri core `convertFileSrc` which is lightweight and can be
    // eagerly imported since this file is only loaded in Tauri context.
    // We lazy-cache it on first call.
    if (!this._convertFileSrc) {
      throw new Error("convertFileSrc not ready. Call initSync() first or use the async version.");
    }
    return this._convertFileSrc(path);
  }

  private _convertFileSrc: ((path: string) => string) | null = null;

  /** Must be called once after construction to initialize sync utilities. */
  async initSync(): Promise<void> {
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    this._convertFileSrc = convertFileSrc;
  }

  // ---- Language / Locale ----

  async getLocale(): Promise<string> {
    // Use browser's navigator.language API (works in Tauri webview)
    return navigator.language || "en-US";
  }

  // ---- File picker ----

  async pickFile(options?: FilePickerOptions): Promise<string | string[] | null> {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const result = await open({
      multiple: options?.multiple ?? false,
      filters: options?.filters,
    });
    if (Array.isArray(result)) return result.length > 0 ? result : null;
    return result;
  }

  // ---- Database ----

  async loadDatabase(path: string): Promise<IDatabase> {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    const normalizedPath = path.startsWith("sqlite:")
      ? path
      : `sqlite:${path.replace(/^file:\/\//, "")}`;
    const tauriDb = await Database.load(normalizedPath);
    return wrapTauriDatabase(tauriDb, normalizedPath);
  }

  // ---- Network ----

  async fetch(url: string, options?: FetchOptions): Promise<Response> {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    const {
      allowInsecure,
      timeoutMs: _timeoutMs,
      responseType: _responseType,
      onDownloadProgress: _onDownloadProgress,
      ...fetchOptions
    } = options ?? {};
    const tauriOptions = allowInsecure
      ? ({
          ...fetchOptions,
          danger: { acceptInvalidCerts: true, acceptInvalidHostnames: true },
        } as any)
      : fetchOptions;
    try {
      return await tauriFetch(url, tauriOptions);
    } catch (error: unknown) {
      // Tauri's fetch (Chromium-based) rejects when the server sends response
      // headers containing characters outside the ISO-8859-1 range (e.g.
      // Chinese filenames in Content-Disposition from WebDAV servers like dufs).
      // Fall back to the browser's native fetch which is more lenient, aligning
      // behaviour with the mobile (XHR) implementation.
      const msg = (error as { message?: string })?.message ?? "";
      if (
        msg.includes("ISO-8859-1") ||
        msg.includes("non ISO") ||
        msg.includes("Failed to construct 'Headers'")
      ) {
        console.warn(
          "[TauriPlatform] tauriFetch failed due to non-ASCII response headers; falling back to native fetch",
        );
        return globalThis.fetch(url, fetchOptions);
      }
      throw error;
    }
  }

  async createWebSocket(url: string, options?: WebSocketOptions): Promise<IWebSocket> {
    const WebSocket = (await import("@tauri-apps/plugin-websocket")).default;
    const ws = await WebSocket.connect(url, {
      headers: options?.headers,
    });

    return {
      send: (data: string | ArrayBuffer) => {
        if (typeof data === "string") {
          ws.send(data);
        } else {
          ws.send(Array.from(new Uint8Array(data)));
        }
      },
      close: () => ws.disconnect(),
      onMessage: (handler) => {
        ws.addListener((msg) => {
          if (typeof msg === "string") handler(msg);
          else if (msg && typeof msg === "object" && "data" in msg) {
            handler((msg as any).data);
          }
        });
      },
      onClose: (handler) => {
        // Tauri WS plugin sends CloseFrame as a message type
        ws.addListener((msg) => {
          if (msg && typeof msg === "object" && "type" in msg && (msg as any).type === "Close") {
            handler();
          }
        });
      },
      onError: (handler) => {
        // Tauri WS errors surface in the promise chain; limited listener support
        ws.addListener((msg) => {
          if (msg && typeof msg === "object" && "type" in msg && (msg as any).type === "Error") {
            handler((msg as any).data);
          }
        });
      },
    };
  }

  // ---- App info ----

  async getAppVersion(): Promise<string> {
    const { getVersion } = await import("@tauri-apps/api/app");
    return getVersion();
  }

  // ---- KV Storage (backed by localStorage on desktop/web) ----

  async kvGetItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async kvSetItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async kvRemoveItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async kvGetAllKeys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }

  // ---- Clipboard ----

  async copyToClipboard(content: string): Promise<void> {
    await navigator.clipboard.writeText(content);
  }

  // ---- File sharing / download ----

  async shareOrDownloadFile(
    content: string,
    filename: string,
    _mimeType: string,
  ): Promise<string | null> {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const ext = filename.split(".").pop() || "";
    const filePath = await save({
      defaultPath: filename,
      filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : undefined,
    });
    if (!filePath) return null;

    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(filePath, content);
    return filePath;
  }
}

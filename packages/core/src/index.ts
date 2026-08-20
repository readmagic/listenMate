/**
 * @listenmate/core — Shared platform-agnostic business logic
 */

// Types
export * from "./types";

// Utils
export { cn, debounce, throttle, eventBus } from "./utils";
export type { EventMap } from "./utils";

// Services (platform abstraction)
export type {
  IPlatformService,
  IDatabase,
  IWebSocket,
  FilePickerOptions,
  WebSocketOptions,
} from "./services";
export { setPlatformService, getPlatformService } from "./services";

// i18n
export { default as i18n, initI18nLanguage, changeAndPersistLanguage } from "./i18n";

// Import dedupe utilities (local file imports only — WebDAV import removed)
export {
  createEmptyImportBooksResult,
  createImportDuplicateIndex,
  findDuplicateBookByHash,
  findLikelyDuplicateBook,
  normalizeImportIdentity,
  stripBookExtension,
} from "./import/import-dedupe";
export type { ImportBooksResult, ImportDuplicateIndex } from "./import/import-dedupe";

// EPUB services
export { inspectEpubBytes } from "./epub/inspect";
export type {
  EpubInspectManifestItem,
  EpubInspectResult,
  EpubInspectSpineItem,
  EpubInspectTocItem,
} from "./epub/inspect";
export { createEpubDraft } from "./epub/draft";
export type {
  EpubDraftCreateResult,
  EpubDraftHistoryEntry,
  EpubDraftManifest,
} from "./epub/draft";
export { readEpubChapterFromBookFile, readEpubChapterFromDraft } from "./epub/chapter";
export type { EpubChapterReadResult } from "./epub/chapter";

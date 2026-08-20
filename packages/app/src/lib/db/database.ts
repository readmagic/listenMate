/**
 * Proxy re-export — actual implementation lives in @listenmate/core/db
 * This file maintains backward compatibility for app-level imports.
 */
export {
  initDatabase,
  initLocalDatabase,
  getBooks,
  getBook,
  getDeletedBookByFileHash,
  getDeletedBookByTitle,
  insertBook,
  updateBook,
  deleteBook,
  getGroups,
  insertGroup,
  updateGroup,
  deleteGroup,
  getHighlights,
  getAllHighlights,
  getAllHighlightsWithBooks,
  getHighlightStats,
  insertHighlight,
  updateHighlight,
  deleteHighlight,
  getNotes,
  getAllNotes,
  insertNote,
  updateNote,
  deleteNote,
  getBookmarks,
  insertBookmark,
  deleteBookmark,
  getReadingSessions,
  getReadingSessionsByDateRange,
  insertReadingSession,
  updateReadingSession,
} from "@listenmate/core/db/database";

export type { HighlightWithBook } from "@listenmate/core/db/database";

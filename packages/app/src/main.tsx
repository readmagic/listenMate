import "./polyfills";
import { i18nReady } from "@listenmate/core/i18n";
import { initI18nLanguage } from "@listenmate/core/i18n";
/**
 * Entry point — mount React app + beforeunload protection
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { onLibraryChanged } from "@listenmate/core/events/library-events";
import { setPlatformService } from "@listenmate/core/services";
import { TauriPlatformService } from "./lib/platform/tauri-platform-service";
import { syncLegacyDesktopLibraryRootConfig } from "./lib/storage/desktop-library-root";
import { useLibraryStore } from "./stores/library-store";
import { flushAllWrites } from "./stores/persist";

// Register platform service before any database/core operations
const tauriPlatform = new TauriPlatformService();
tauriPlatform.initSync().catch(console.error);
setPlatformService(tauriPlatform);

const desktopDataRootReady = syncLegacyDesktopLibraryRootConfig().catch(console.error);

// Ensure i18n is fully initialized before rendering
i18nReady.then(() => {
  desktopDataRootReady.catch(console.error);

  // Restore saved theme from localStorage
  const savedTheme = localStorage.getItem("listenmate-theme");
  if (savedTheme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else if (savedTheme && ["light", "dark", "sepia"].includes(savedTheme)) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else {
    // Default to sepia theme
    document.documentElement.setAttribute("data-theme", "sepia");
  }

  // Restore saved language from platform KV storage
  initI18nLanguage().catch(console.error);

  // Flush pending state writes before window closes
  window.addEventListener("beforeunload", () => {
    flushAllWrites();
  });

  // Initialize database and load books
  desktopDataRootReady.then(() => {
    useLibraryStore.getState().loadBooks();
  });

  // Refresh library store when external tools modify books/tags
  onLibraryChanged((deletedTags) => useLibraryStore.getState().loadBooks(deletedTags));

  // Fire-and-forget: preload foliate-js core modules so they're cached for later use
  import("foliate-js/view.js").catch(() => {});
  import("foliate-js/paginator.js").catch(() => {});

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

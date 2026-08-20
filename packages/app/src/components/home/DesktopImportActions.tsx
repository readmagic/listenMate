import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLibraryStore } from "@/stores/library-store";
import type { ImportBooksResult } from "@listenmate/core";
import { open } from "@tauri-apps/plugin-dialog";
import { BookOpen, ChevronRight } from "lucide-react";
import { type ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface DesktopImportActionsProps {
  children: ReactElement;
  align?: "start" | "center" | "end";
}

function formatImportResultMessage(
  t: ReturnType<typeof useTranslation>["t"],
  result: ImportBooksResult,
): string {
  return t("library.importResultSummary", {
    imported: result.imported.length,
    skipped: result.skippedDuplicates.length,
    failed: result.failures.length,
  });
}

export function DesktopImportActions({ children, align = "end" }: DesktopImportActionsProps) {
  const { t } = useTranslation();
  const importBooks = useLibraryStore((state) => state.importBooks);

  const handleLocalImport = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Books",
            extensions: [
              "epub",
              "EPUB",
              "pdf",
              "PDF",
              "mobi",
              "MOBI",
              "azw",
              "AZW",
              "azw3",
              "AZW3",
              "fb2",
              "FB2",
              "fbz",
              "FBZ",
              "txt",
              "TXT",
              "cbz",
              "CBZ",
              "umd",
              "UMD",
            ],
          },
        ],
      } as const);
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      if (paths.length > 0) {
        const result = await importBooks(paths);
        toast.success(formatImportResultMessage(t, result));
      }
    } catch {
      // user cancelled
    }
  }, [importBooks, t]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={8}
        className="w-[320px] rounded-2xl border-border/80 p-1.5 shadow-xl"
      >
        <DropdownMenuItem
          className="items-center gap-3 rounded-xl px-3 py-2.5"
          onSelect={(event) => {
            event.preventDefault();
            void handleLocalImport();
          }}
        >
          <div className="flex size-7 shrink-0 items-center justify-center text-primary">
            <BookOpen className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1 whitespace-nowrap text-sm font-medium text-foreground">
            {t("library.importSourceLocal", "本地文件")}
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

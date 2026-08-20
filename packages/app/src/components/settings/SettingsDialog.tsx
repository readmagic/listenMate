/**
 * SettingsDialog — main settings modal using shadcn Dialog
 */
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { type SettingsTab, useAppStore } from "@/stores/app-store";
import { cn } from "@listenmate/core/utils";
import { useTranslation } from "react-i18next";
import { FontSettings } from "./FontSettings";
import { GeneralSettings } from "./GeneralSettings";
import { ReadSettingsPanel } from "./ReadSettings";
import { TTSSettings } from "./TTSSettings";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const TAB_IDS: SettingsTab[] = ["general", "reading", "fonts", "tts"];
const TAB_KEYS: Record<SettingsTab, string> = {
  general: "settings.general",
  reading: "settings.reading",
  fonts: "settings.fonts",
  tts: "settings.tts",
};

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const settingsTab = useAppStore((s) => s.settingsTab);
  const setShowSettings = useAppStore((s) => s.setShowSettings);

  const setActiveTab = (tab: SettingsTab) => {
    setShowSettings(true, tab);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex min-h-[80vh] max-h-[80vh] w-[800px] max-w-[800px] flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border px-4 py-3.5">
          <DialogTitle className="text-base font-semibold">{t("settings.title")}</DialogTitle>
          <p className="mt-0.5 text-xs text-muted-foreground/60">{t("settings.realtimeHint")}</p>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0 overflow-y-auto border-r border-border p-2.5">
            <nav className="space-y-0.5">
              {TAB_IDS.map((id) => (
                <button
                  key={id}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                    settingsTab === id
                      ? "bg-muted/80 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                  onClick={() => setActiveTab(id)}
                >
                  <span>{t(TAB_KEYS[id])}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            {settingsTab === "general" && <GeneralSettings />}
            {settingsTab === "reading" && <ReadSettingsPanel />}
            {settingsTab === "fonts" && <FontSettings />}
            {settingsTab === "tts" && <TTSSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

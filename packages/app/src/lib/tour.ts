import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import i18n from "@listenmate/core/i18n";

export function startTour() {
  const d = driver({
    showProgress: true,
    animate: true,
    overlayColor: "rgba(0, 0, 0, 0.5)",
    stagePadding: 10,
    stageRadius: 8,
    nextBtnText: i18n.t("tour.next", "下一步"),
    prevBtnText: i18n.t("tour.prev", "上一步"),
    doneBtnText: i18n.t("tour.done", "完成"),
    progressText: i18n.t("tour.progress", "第 {{current}} 步，共 {{total}} 步"),
    steps: [
      {
        element: "#tour-add-book",
        popover: {
          title: i18n.t("tour.addBook.title", "Add Your First Book"),
          description: i18n.t(
            "tour.addBook.desc",
            "Click here to import EPUB, PDF, and other supported formats.",
          ),
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-book-list",
        popover: {
          title: i18n.t("tour.bookList.title", "Your Library"),
          description: i18n.t(
            "tour.bookList.desc",
            "All your imported books will appear here. Click any book to start reading.",
          ),
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-settings",
        popover: {
          title: i18n.t("tour.settings.title", "Settings"),
          description: i18n.t("tour.settings.desc", "Configure reading, fonts, TTS and more."),
          side: "right",
          align: "start",
        },
      },
    ],
  });

  d.drive();
}

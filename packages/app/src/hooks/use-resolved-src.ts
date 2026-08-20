import { resolveFileSrc } from "@/stores/library-store";
import { useEffect, useState } from "react";

export function useResolvedSrc(path: string | undefined): string {
  const [resolved, setResolved] = useState("");

  useEffect(() => {
    if (!path) {
      setResolved("");
      return;
    }

    if (path.startsWith("asset://") || path.startsWith("http")) {
      setResolved(path);
      return;
    }

    resolveFileSrc(path)
      .then(setResolved)
      .catch((err) => {
        console.warn("[useResolvedSrc] Failed to resolve path:", path, err);
        setResolved("");
      });
  }, [path]);

  return resolved;
}

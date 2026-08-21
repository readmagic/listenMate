/**
 * PDF highlight anchor: serialize/deserialize selection rects to a stable
 * string stored in the `highlights.cfi` column.
 *
 * The anchor is normalized to the iframe's `.textLayer` container (0~1
 * proportions), so it survives zoom (textLayer and Range share the same
 * coordinate system, scaling together).
 */
export interface PdfRect {
  /** normalized left, 0~1 relative to textLayer width */
  l: number;
  /** normalized top, 0~1 relative to textLayer height */
  t: number;
  /** normalized right, 0~1 */
  r: number;
  /** normalized bottom, 0~1 */
  b: number;
}

export interface PdfAnchor {
  pdf: true;
  /** section index (0-indexed, matches FixedLayout.getContents().index) */
  p: number;
  rects: PdfRect[];
}

/**
 * Serialize a DOM selection Range into a PDF anchor string.
 *
 * @param page section index (0-indexed, matches FixedLayout.getContents().index)
 * @param range Selection range from iframe.contentWindow.getSelection().getRangeAt(0)
 * @param containerRect `.textLayer` element's getBoundingClientRect() in the same coordinate space as range rects
 */
export function serializePdfAnchor(
  page: number,
  range: Range,
  containerRect: DOMRect,
): string {
  const rects: PdfRect[] = [];
  const w = containerRect.width || 1;
  const h = containerRect.height || 1;
  for (const rect of range.getClientRects()) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    rects.push({
      l: (rect.left - containerRect.left) / w,
      t: (rect.top - containerRect.top) / h,
      r: (rect.right - containerRect.left) / w,
      b: (rect.bottom - containerRect.top) / h,
    });
  }
  const anchor: PdfAnchor = { pdf: true, p: page, rects };
  return JSON.stringify(anchor);
}

/** Deserialize a cfi string into a PdfAnchor, or null if not a PDF anchor. */
export function deserializePdfAnchor(cfi: string): PdfAnchor | null {
  if (!cfi || !cfi.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(cfi) as Partial<PdfAnchor>;
    if (parsed.pdf !== true || typeof parsed.p !== "number" || !Array.isArray(parsed.rects)) {
      return null;
    }
    return parsed as PdfAnchor;
  } catch {
    return null;
  }
}

/** Check whether a cfi string is a PDF anchor (vs. an EPUB CFI). */
export function isPdfAnchor(cfi: string | undefined | null): boolean {
  if (!cfi) return false;
  return deserializePdfAnchor(cfi) !== null;
}

/** Extract the page number from a PDF anchor cfi, or null. */
export function pdfAnchorPage(cfi: string | undefined | null): number | null {
  if (!cfi) return null;
  const anchor = deserializePdfAnchor(cfi);
  return anchor?.p ?? null;
}

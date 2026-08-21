import { describe, expect, it } from "vitest";
import {
  deserializePdfAnchor,
  isPdfAnchor,
  pdfAnchorPage,
  serializePdfAnchor,
  type PdfRect,
} from "./highlight-anchor";

// Mock DOMRect-like object (only the fields serializePdfAnchor reads).
interface MockRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface MockRange {
  getClientRects(): MockRect[];
}

function makeRange(rects: MockRect[]): MockRange {
  return { getClientRects: () => rects };
}

function makeContainerRect(left: number, top: number, width: number, height: number): MockRect {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

describe("highlight-anchor", () => {
  describe("serializePdfAnchor", () => {
    it("normalizes range rects relative to the textLayer container", () => {
      // container 100x200 at (10, 20); one rect 50x80 at origin offset (20, 40)
      const container = makeContainerRect(10, 20, 100, 200);
      const range = makeRange([
        { left: 30, top: 60, right: 70, bottom: 140, width: 40, height: 80 },
      ]);

      const cfi = serializePdfAnchor(3, range as unknown as Range, container as unknown as DOMRect);

      const anchor = JSON.parse(cfi);
      expect(anchor.pdf).toBe(true);
      expect(anchor.p).toBe(3);
      expect(anchor.rects).toHaveLength(1);
      const r: PdfRect = anchor.rects[0];
      expect(r.l).toBeCloseTo(0.2, 5); // (30-10)/100
      expect(r.t).toBeCloseTo(0.2, 5); // (60-20)/200
      expect(r.r).toBeCloseTo(0.6, 5); // (70-10)/100
      expect(r.b).toBeCloseTo(0.6, 5); // (140-20)/200
    });

    it("skips zero-sized rects from getClientRects", () => {
      const container = makeContainerRect(0, 0, 100, 100);
      const range = makeRange([
        { left: 10, top: 10, right: 10, bottom: 20, width: 0, height: 10 },
        { left: 10, top: 10, right: 20, bottom: 20, width: 10, height: 10 },
      ]);

      const cfi = serializePdfAnchor(1, range as unknown as Range, container as unknown as DOMRect);
      const anchor = JSON.parse(cfi);
      expect(anchor.rects).toHaveLength(1);
    });

    it("handles zero-width container without NaN (falls back to 1)", () => {
      const container = makeContainerRect(0, 0, 0, 0);
      const range = makeRange([
        { left: 0, top: 0, right: 5, bottom: 5, width: 5, height: 5 },
      ]);

      const cfi = serializePdfAnchor(1, range as unknown as Range, container as unknown as DOMRect);
      const anchor = JSON.parse(cfi);
      expect(Number.isNaN(anchor.rects[0].l)).toBe(false);
    });
  });

  describe("deserializePdfAnchor", () => {
    it("round-trips a serialized anchor", () => {
      const container = makeContainerRect(0, 0, 100, 100);
      const range = makeRange([
        { left: 10, top: 10, right: 60, bottom: 40, width: 50, height: 30 },
      ]);
      const cfi = serializePdfAnchor(7, range as unknown as Range, container as unknown as DOMRect);

      const anchor = deserializePdfAnchor(cfi);
      expect(anchor).not.toBeNull();
      expect(anchor?.pdf).toBe(true);
      expect(anchor?.p).toBe(7);
      expect(anchor?.rects).toHaveLength(1);
      expect(anchor?.rects[0].l).toBeCloseTo(0.1, 5);
      expect(anchor?.rects[0].t).toBeCloseTo(0.1, 5);
      expect(anchor?.rects[0].r).toBeCloseTo(0.6, 5);
      expect(anchor?.rects[0].b).toBeCloseTo(0.4, 5);
    });

    it("returns null for EPUB CFI strings", () => {
      expect(deserializePdfAnchor("epubcfi(/6/4!/4/2:0,20)")).toBeNull();
    });

    it("returns null for malformed JSON", () => {
      expect(deserializePdfAnchor("{not json")).toBeNull();
      expect(deserializePdfAnchor("")).toBeNull();
    });

    it("returns null for JSON missing the pdf:true marker", () => {
      expect(deserializePdfAnchor('{"p":1,"rects":[]}')).toBeNull();
      expect(deserializePdfAnchor('{"pdf":false,"p":1,"rects":[]}')).toBeNull();
    });

    it("returns null for missing page or rects", () => {
      expect(deserializePdfAnchor('{"pdf":true,"rects":[]}')).toBeNull();
      expect(deserializePdfAnchor('{"pdf":true,"p":1}')).toBeNull();
    });
  });

  describe("isPdfAnchor", () => {
    it("true for PDF anchor, false for EPUB CFI and garbage", () => {
      const pdfCfi = JSON.stringify({ pdf: true, p: 1, rects: [{ l: 0, t: 0, r: 0.1, b: 0.1 }] });
      expect(isPdfAnchor(pdfCfi)).toBe(true);
      expect(isPdfAnchor("epubcfi(/6/4)")).toBe(false);
      expect(isPdfAnchor("")).toBe(false);
      expect(isPdfAnchor(undefined)).toBe(false);
      expect(isPdfAnchor(null)).toBe(false);
    });
  });

  describe("pdfAnchorPage", () => {
    it("extracts page number from PDF anchor", () => {
      const cfi = JSON.stringify({ pdf: true, p: 42, rects: [] });
      expect(pdfAnchorPage(cfi)).toBe(42);
    });

    it("returns null for non-PDF cfi", () => {
      expect(pdfAnchorPage("epubcfi(/6/4)")).toBeNull();
      expect(pdfAnchorPage(undefined)).toBeNull();
    });
  });
});

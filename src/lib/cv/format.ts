// Locked CV format requirements (Ketentuan_Format_CV_ATS_FOLIO.md).
// Everything visual lives here so the PDF renderer and the web preview cannot
// drift apart again: preview converts the same points to pixels.
//
// Scope: font, margin, spacing, colour, appearance only. Section order and
// content stay in `cvContent.sectionOrder`.

export const CV_FORMAT = {
  // §1 — one font only. Fallbacks exist for rendering safety, not as choices.
  fontFamily: "Arial, Helvetica, sans-serif",
  // Arial must be embedded in the PDF; the standard PDF fonts (Helvetica
  // etc.) are metrically different and would break "Arial only".
  fontFiles: {
    regular: "arial.ttf",
    bold: "arialbd.ttf",
    italic: "ariali.ttf",
    boldItalic: "arialbi.ttf",
  },
  // §1 — sizes in points, locked.
  pointSizes: {
    name: 20,
    contact: 11,
    summary: 11,
    sectionHeading: 13,
    organization: 11,
    location: 11,
    role: 11,
    bullet: 11,
    date: 11,
    leadIn: 11,
  },
  // §2 — A4, 2 cm on every side. 1 cm = 28.3465 pt, so 2 cm = 56.6929 pt.
  marginCm: 2,
  // §3 — spacing in points.
  spacing: {
    lineHeight: 1.15,
    beforeHeading: 12,
    afterHeading: 6,
    betweenEntries: 6,
    betweenBullets: 2,
    nameToContact: 4,
    contactToSummary: 6,
  },
  // §4 — everything is black. No accent colours anywhere.
  color: "#000000",
  ruleWidth: 1,
  // §6 — never below 10 pt.
  minimumPointSize: 10,
} as const;

// Preview conversion stated by the requirements: 11 pt = 14.67 px.
export const pointsToPixels = (points: number) => (points * 4) / 3;

// Body line height for a 11 pt block: 11 * 1.15 = 12.65 pt.
export const lineGapFor = (fontSize: number) =>
  fontSize * CV_FORMAT.spacing.lineHeight - fontSize;

export type CvFormat = typeof CV_FORMAT;

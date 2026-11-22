import { existsSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { cvContentSchema, type CvContent, type CvEntry, type CvSectionKey } from "./schema";
import { CV_FORMAT, lineGapFor } from "./format";


const listSections: CvSectionKey[] = ["education", "experience", "projects", "certifications", "organizations"];

// Points map 1:1 to PDF units (72 dpi), so the locked sizes are used directly.
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
// 2 cm margin on every side: 1 cm = 72 / 2.54 = 28.35 pt.
const MARGIN = (CV_FORMAT.marginCm / 2.54) * 72;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

// Arial only, so the font must be embedded. Liberation Sans is the
// metric-compatible fallback that Linux images ship.
const FONT_CANDIDATES: Record<string, string[]> = {
  regular: ["arial.ttf", "LiberationSans-Regular.ttf", "DejaVuSans.ttf"],
  bold: ["arialbd.ttf", "LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"],
  italic: ["ariali.ttf", "LiberationSans-Italic.ttf", "DejaVuSans-Oblique.ttf"],
  boldItalic: ["arialbi.ttf", "LiberationSans-BoldItalic.ttf", "DejaVuSans-BoldOblique.ttf"],
};

function fontDir() {
  const fromEnv = process.env.CV_FONT_DIR;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return "C:\\Windows\\Fonts";
}

function resolveFont(kind: keyof typeof FONT_CANDIDATES): string | null {
  const dir = fontDir();
  for (const name of FONT_CANDIDATES[kind]) {
    const full = join(dir, name);
    if (existsSync(full)) return full;
  }
  return null;
}

function toBullets(description: string): string[] {
  const lines = description
    .split(/\r?\n/)
    .map(line => line.replace(/^[\s\u2022\-*]+/, "").trim())
    .filter(Boolean);
  return lines.length ? lines : (description.trim() ? [description.replace(/^[\s\u2022\-*]+/, "").trim()] : []);
}

// The lead-in before the colon is bold, e.g. "Kompetisi (2021):".
function splitLeadIn(text: string): { lead: string; rest: string } | null {
  const match = text.match(/^([^:]{1,60}):\s*(.+)$/);
  return match ? { lead: `${match[1]}:`, rest: ` ${match[2]}` } : null;
}

// Title Case section titles.
const formatLabels: Partial<Record<CvSectionKey, string>> = {
  education: "Pendidikan",
  experience: "Pengalaman Kerja",
  organizations: "Pengalaman Organisasi",
  projects: "Proyek dan Portofolio",
  certifications: "Sertifikasi dan Pelatihan",
  skills: "Keterampilan",
};

const sectionLabel = (key: CvSectionKey) => formatLabels[key] ?? key;


export async function renderCvPdf(content: CvContent): Promise<Buffer> {
  const data = cvContentSchema.parse(content);
  const size = CV_FORMAT.pointSizes;
  const gap = CV_FORMAT.spacing;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: { Title: `CV ${data.contact.fullName}`, Author: data.contact.fullName },
    });
    const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Register the single allowed family. Without Arial the standard Helvetica
    // is used so an export still works; deployment should set CV_FONT_DIR.
    const regular = resolveFont("regular");
    if (regular) {
      doc.registerFont("cv", regular);
      doc.registerFont("cv-bold", resolveFont("bold") ?? regular);
      doc.registerFont("cv-italic", resolveFont("italic") ?? regular);
      doc.registerFont("cv-bold-italic", resolveFont("boldItalic") ?? regular);
    } else {
      doc.registerFont("cv", "Helvetica");
      doc.registerFont("cv-bold", "Helvetica-Bold");
      doc.registerFont("cv-italic", "Helvetica-Oblique");
      doc.registerFont("cv-bold-italic", "Helvetica-BoldOblique");
    }

    // Every text and rule is black.
    const applyFont = (kind: "regular" | "bold" | "italic", points: number) => {
      const family = kind === "regular" ? "cv" : kind === "bold" ? "cv-bold" : "cv-italic";
      doc.font(family).fontSize(points).fillColor(CV_FORMAT.color);
      return doc;
    };

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > A4_HEIGHT - MARGIN) {
        doc.addPage();
        doc.y = MARGIN;
        doc.x = MARGIN;
      }
    };

    // Name: 20 pt, bold, ALL CAPS, left aligned.
    applyFont("bold", size.name);
    doc.text((data.contact.fullName || "Nama Belum Diisi").toUpperCase(), MARGIN, MARGIN, {
      width: CONTENT_WIDTH, align: "left",
    });

    // Contact: plain text separated by " | ", city on its own line.
    doc.y += gap.nameToContact;
    const contactLine = [data.contact.phone, data.contact.email, ...data.contact.links].filter(Boolean).join(" | ");
    applyFont("regular", size.contact);
    if (contactLine) doc.text(contactLine, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: lineGapFor(size.contact) });
    if (data.contact.location) doc.text(data.contact.location, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: lineGapFor(size.contact) });

    // Summary: plain paragraph right after the contact block, without a heading.
    const summaryText = data.summary.trim() || data.contact.headline;
    if (summaryText) {
      doc.y += gap.contactToSummary;
      applyFont("regular", size.summary);
      doc.text(summaryText, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: lineGapFor(size.summary) });
    }

    const sectionHeading = (label: string) => {
      ensureSpace(gap.beforeHeading + 34);
      doc.y += gap.beforeHeading;
      applyFont("bold", size.sectionHeading);
      doc.text(label, MARGIN, doc.y, { width: CONTENT_WIDTH });
      // Thin black rule across the full content width.
      const ruleY = doc.y + 2;
      doc.save().strokeColor(CV_FORMAT.color).lineWidth(CV_FORMAT.ruleWidth)
        .moveTo(MARGIN, ruleY).lineTo(MARGIN + CONTENT_WIDTH, ruleY).stroke().restore();
      doc.x = MARGIN;
      doc.y = ruleY + gap.afterHeading;
    };

    // Hanging indent: wrapped lines start under the text, not under the bullet.
    const bullet = (text: string) => {
      ensureSpace(size.bullet * CV_FORMAT.spacing.lineHeight * 2);
      const indent = doc.widthOfString("\u2022 ") + 2;
      const lead = splitLeadIn(text);
      applyFont("regular", size.bullet);
      doc.text("\u2022 ", MARGIN, doc.y, { continued: true, lineGap: lineGapFor(size.bullet) });
      if (lead) {
        applyFont("bold", size.bullet);
        doc.text(lead.lead, { continued: true });
        applyFont("regular", size.bullet);
        doc.text(lead.rest, { width: CONTENT_WIDTH - indent });
      } else {
        doc.text(text, { width: CONTENT_WIDTH - indent });
      }
      doc.x = MARGIN;
      doc.y += gap.betweenBullets;
    };

    // Entry: institution + " - " + location with the date on the same line to
    // the right (drawn, never a table), then the italic role and bullets.
    const renderEntry = (item: CvEntry) => {
      const headName = item.organization || item.title;
      const locationText = item.organization ? (item.location ?? "").trim() : "";
      const periodText = item.period.trim();
      const lineY = doc.y;

      applyFont("bold", size.organization);
      const nameWidth = doc.widthOfString(headName);
      // The leading space keeps the date separated from the location when an
      // ATS extracts the line: "... - Semarang 2024 - Present", not "Semarang2024".
      const paddedPeriod = periodText ? ` ${periodText}` : "";
      const periodWidth = paddedPeriod ? doc.widthOfString(paddedPeriod) + 12 : 0;
      const headWidth = Math.max(CONTENT_WIDTH * 0.55, CONTENT_WIDTH - periodWidth);

      doc.text(headName, MARGIN, lineY, { width: headWidth });
      if (locationText) {
        // Drawn right after the bold name so copy-paste keeps
        // "Institution - Location" reading order.
        applyFont("regular", size.location);
        doc.text(" - " + locationText, MARGIN + nameWidth, lineY, { width: Math.max(60, headWidth - nameWidth) });
      }
      const afterHead = doc.y;

      if (paddedPeriod) {
        applyFont("regular", size.date);
        doc.text(paddedPeriod, MARGIN, lineY, { width: CONTENT_WIDTH, align: "right" });
      }
      doc.x = MARGIN;
      doc.y = Math.max(afterHead, lineY + size.organization * CV_FORMAT.spacing.lineHeight);

      if (item.organization && item.title) {
        applyFont("italic", size.role);
        doc.text(item.title, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: lineGapFor(size.role) });
      }

      for (const text of toBullets(item.description)) bullet(text);
      doc.y += gap.betweenEntries;
      doc.x = MARGIN;
    };

    for (const key of data.sectionOrder) {
      if (key === "summary") continue; // Rendered under the header, without a heading.

      if (key === "skills") {
        if (!data.skills.length) continue;
        sectionHeading(sectionLabel(key));
        applyFont("regular", size.bullet);
        doc.text(data.skills.join(", "), MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: lineGapFor(size.bullet) });
        doc.y += gap.betweenEntries;
        continue;
      }

      if (!listSections.includes(key)) continue;
      const items = data[key as Exclude<CvSectionKey, "summary" | "skills">];
      if (!items.length) continue;

      sectionHeading(sectionLabel(key));
      for (const item of items) {
        ensureSpace(52);
        renderEntry(item);
      }
    }

    doc.end();
  });
}


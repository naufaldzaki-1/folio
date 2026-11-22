"use client";
import { CV_FORMAT, pointsToPixels } from "@/lib/cv/format";
import type { CvContent, CvEntry, CvSectionKey } from "@/lib/cv/schema";

const listSections: CvSectionKey[] = ["education", "experience", "projects", "certifications", "organizations"];
type Config = { accent?: string; headingStyle?: string };

// Web preview of the ATS template. Every value comes from CV_FORMAT, the same
// module the PDF renderer reads, so "preview looks different from the export"
// cannot happen again: 11 pt = 14.67 px as the locked requirements state.

const px = pointsToPixels;
const size = CV_FORMAT.pointSizes;
const gap = CV_FORMAT.spacing;
// A4 at 96 dpi: 210 mm = 794 px, 297 mm = 1123 px.
const A4 = { width: 794, minHeight: 1123 };
const margin = (CV_FORMAT.marginCm / 2.54) * 96; // 2 cm ≈ 75.6 px

function toBullets(description: string): string[] {
  const lines = description
    .split(/\r?\n/)
    .map(line => line.replace(/^[\s•\-–—*]+/, "").trim())
    .filter(Boolean);
  return lines.length ? lines : (description.trim() ? [description.replace(/^[\s•\-–—*]+/, "").trim()] : []);
}

// §5: the lead-in before the colon is bold ("Kompetisi (2021):").
function splitLeadIn(text: string) {
  const match = text.match(/^([^:]{1,60}):\s*(.+)$/);
  return match ? { lead: `${match[1]}:`, rest: ` ${match[2]}` } : null;
}

const formatLabels: Partial<Record<CvSectionKey, string>> = {
  education: "Pendidikan",
  experience: "Pengalaman Kerja",
  organizations: "Pengalaman Organisasi",
  projects: "Proyek dan Portofolio",
  certifications: "Sertifikasi dan Pelatihan",
  skills: "Keterampilan",
};


export function CvPreview({ content }: { content: CvContent; config?: Config }) {
  const entries = (key: CvSectionKey): CvEntry[] =>
    listSections.includes(key) ? (content[key] as CvEntry[]) : [];

  const contactLine = [content.contact.phone, content.contact.email, ...content.contact.links].filter(Boolean).join(" | ");
  const summaryText = content.summary.trim() || content.contact.headline;

  // Everything is black (§4) and left aligned (§2); line height is 1.15 (§3).
  const body = {
    color: CV_FORMAT.color,
    fontSize: px(size.bullet),
    lineHeight: CV_FORMAT.spacing.lineHeight,
    textAlign: "left" as const,
  };

  const heading = (label: string) => (
    <h3
      style={{
        fontSize: px(size.sectionHeading),
        fontWeight: 700,
        lineHeight: CV_FORMAT.spacing.lineHeight,
        color: CV_FORMAT.color,
        marginTop: px(gap.beforeHeading),
        marginBottom: px(gap.afterHeading),
        paddingBottom: 2,
        borderBottom: `${CV_FORMAT.ruleWidth}px solid ${CV_FORMAT.color}`,
      }}
    >
      {label}
    </h3>
  );

  return (
    <article
      aria-label="Pratinjau CV"
      style={{
        width: A4.width,
        minHeight: A4.minHeight,
        padding: margin,
        background: "#FFFFFF",
        color: CV_FORMAT.color,
        // §1: Arial only. Fallbacks are for render safety, not alternatives.
        fontFamily: CV_FORMAT.fontFamily,
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        boxSizing: "border-box",
      }}
    >
      {/* ── Name: 20 pt, bold, ALL CAPS, left aligned ── */}
      <h2 style={{ fontSize: px(size.name), fontWeight: 700, lineHeight: CV_FORMAT.spacing.lineHeight, margin: 0, textTransform: "uppercase" }}>
        {content.contact.fullName || "Nama Belum Diisi"}
      </h2>

      {/* ── Contact: plain text, " | " separated, city on its own line ── */}
      <div style={{ ...body, marginTop: px(gap.nameToContact) }}>
        {contactLine && <p style={{ margin: 0 }}>{contactLine}</p>}
        {content.contact.location && <p style={{ margin: 0 }}>{content.contact.location}</p>}
      </div>

      {/* ── Summary: plain paragraph, no heading ── */}
      {summaryText && (
        <p style={{ ...body, marginTop: px(gap.contactToSummary), marginBottom: 0 }}>{summaryText}</p>
      )}


      {/* ── Sections ── */}
      {content.sectionOrder.map(key => {
        if (key === "summary") return null; // Rendered above, without a heading.

        if (key === "skills") {
          return content.skills.length ? (
            <section key={key}>
              {heading(formatLabels.skills ?? "Keterampilan")}
              <p style={{ ...body, margin: 0 }}>{content.skills.join(", ")}</p>
            </section>
          ) : null;
        }

        const items = entries(key);
        if (!items.length) return null;

        return (
          <section key={key}>
            {heading(formatLabels[key] ?? key)}
            {items.map(item => (
              <div key={item.id} style={{ marginBottom: px(gap.betweenEntries) }}>
                {/* Line 1: institution (bold) + " - " + location, date right.
                    Flex row, never a table (§5). */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <p style={{ ...body, fontWeight: 700, margin: 0 }}>
                    {item.organization || item.title}
                    {item.organization && item.location ? (
                      <span style={{ fontWeight: 400 }}> - {item.location}</span>
                    ) : null}
                  </p>
                  {item.period && <span style={{ ...body, whiteSpace: "nowrap" }}>{item.period}</span>}
                </div>

                {/* Line 2: degree / role, italic */}
                {item.organization && item.title && (
                  <p style={{ ...body, fontStyle: "italic", margin: 0 }}>{item.title}</p>
                )}

                {/* Bullets with a hanging indent (§3) */}
                {toBullets(item.description).map((text, index) => {
                  const lead = splitLeadIn(text);
                  return (
                    <p
                      key={index}
                      style={{
                        ...body,
                        margin: 0,
                        marginTop: px(gap.betweenBullets),
                        paddingLeft: px(12),
                        textIndent: px(-12),
                      }}
                    >
                      <span>• </span>
                      {lead ? (
                        <>
                          <strong>{lead.lead}</strong>
                          {lead.rest}
                        </>
                      ) : text}
                    </p>
                  );
                })}
              </div>
            ))}
          </section>
        );
      })}
    </article>
  );
}

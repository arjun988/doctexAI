import type { DocumentLayout } from "@/lib/documentLayout";

/** Ensures KaTeX rules ship with this chunk; root layout also imports the same file. */
import "katex/dist/katex.min.css";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wrapExportedBody(body: string, layout: DocumentLayout): string {
  let out = "";
  if (layout.headerText.trim()) {
    out += `<header style="font-size:11pt;color:#444;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:16px;text-align:center;white-space:pre-wrap">${escapeHtml(layout.headerText)}</header>`;
  }
  out += `<article>${body}</article>`;
  if (layout.footerText.trim()) {
    out += `<footer style="font-size:11pt;color:#444;border-top:1px solid #ddd;padding-top:8px;margin-top:16px;text-align:center;white-space:pre-wrap">${escapeHtml(layout.footerText)}</footer>`;
  }
  return out;
}

function pageCss(layout: DocumentLayout): string {
  const pageSize = layout.orientation === "landscape" ? "A4 landscape" : "A4";
  return `@page { size: ${pageSize}; margin: ${layout.marginTop} ${layout.marginRight} ${layout.marginBottom} ${layout.marginLeft}; }`;
}

/** Styles for downloadable .html (includes @page). */
export function getHtmlExportStyles(layout: DocumentLayout): string {
  return `<style>
      ${pageCss(layout)}
      body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 0; padding: 12px; box-sizing: border-box; }
      article { column-count: ${layout.columns}; column-gap: 1.25em; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
      img { max-width: 100%; height: auto; }
      .doc-page-break { break-after: page; page-break-after: always; height: 0; margin: 0; border: 0; }
      ul[data-type="taskList"] { list-style: none; padding-left: 0; }
      ul[data-type="taskList"] li { display: flex; gap: 0.5rem; align-items: flex-start; }
    </style>`;
}

/** Body-only styles for PDF capture node (jsPDF applies page margins). */
export function getPdfRootStyles(layout: DocumentLayout): string {
  return `
      .doctex-pdf-export {
        font-family: Georgia, "Times New Roman", serif;
        color: #111;
        font-size: 11pt;
        line-height: 1.6;
        box-sizing: border-box;
        background: #fff;
        overflow: visible;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      .doctex-pdf-export article {
        column-count: ${layout.columns};
        column-gap: 1.25em;
        overflow: visible;
        max-width: 100%;
      }
      .doctex-pdf-export table { border-collapse: collapse; width: 100%; table-layout: fixed; word-break: break-word; }
      .doctex-pdf-export td,
      .doctex-pdf-export th { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
      .doctex-pdf-export img { max-width: 100%; height: auto; }
      .doctex-pdf-export .doc-page-break { break-after: page; page-break-after: always; height: 0; margin: 0; border: 0; }
      .doctex-pdf-export ul[data-type="taskList"] { list-style: none; padding-left: 0; }
      .doctex-pdf-export ul[data-type="taskList"] li { display: flex; gap: 0.5rem; align-items: flex-start; }
      .doctex-pdf-export .katex { font-size: 1.05em; }
    `;
}

function marginMm(value: string, fallback: number): number {
  const m = /^([\d.]+)\s*mm$/i.exec(value.trim());
  return m ? parseFloat(m[1]) : fallback;
}

/** CSS length mm → px at 96dpi (browser print/CSS convention). */
function mmToPx(mm: number): number {
  return (mm / 25.4) * 96;
}

/**
 * PDF via html2canvas + jsPDF. Uses bundled KaTeX CSS (no CDN — avoids Tracking Prevention).
 */
export async function exportDocumentToPdf(bodyHtml: string, layout: DocumentLayout): Promise<void> {
  const wrapped = wrapExportedBody(bodyHtml, layout);
  const topM = marginMm(layout.marginTop, 18);
  const rightM = marginMm(layout.marginRight, 22);
  const bottomM = marginMm(layout.marginBottom, 18);
  const leftM = marginMm(layout.marginLeft, 22);
  /** Physical width of paper in mm (A4 long edge when landscape). */
  const pageWidthMm = layout.orientation === "landscape" ? 297 : 210;
  const contentWmm = Math.max(80, pageWidthMm - leftM - rightM);

  const shell = document.createElement("div");
  shell.className = "doctex-pdf-export";
  shell.setAttribute("data-doctex-pdf-capture", "");

  const styleEl = document.createElement("style");
  styleEl.textContent = getPdfRootStyles(layout);
  shell.appendChild(styleEl);

  const contentRoot = document.createElement("div");
  contentRoot.innerHTML = wrapped;
  shell.appendChild(contentRoot);

  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    "min-width:0",
    "max-width:none",
    "min-height:1px",
    "background:#ffffff",
    "color:#111111",
    "box-sizing:border-box",
    "opacity:1",
    "pointer-events:none",
    "overflow:visible",
  ].join(";");
  host.appendChild(shell);

  document.body.appendChild(host);

  try {
    const { default: renderMathInElement } = await import("katex/dist/contrib/auto-render.mjs");
    renderMathInElement(shell, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
      errorColor: "#b91c1c",
    });

    await document.fonts.ready;
    void shell.offsetHeight;
    void host.offsetHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 200));

    /* Pixel width must match the printable width in mm. If we rasterize wider than that,
       html2pdf shrinks the bitmap to fit the page — text looks tiny. Do not use scrollWidth here. */
    const captureW = Math.ceil(mmToPx(contentWmm));
    shell.style.maxWidth = `${captureW}px`;
    shell.style.width = `${captureW}px`;
    host.style.width = `${captureW}px`;
    void shell.offsetHeight;
    /** Full content height; html2canvas clips if this is even slightly too small. */
    const captureH = Math.max(Math.ceil(shell.scrollHeight), 1) + 8;

    const html2pdf = (await import("html2pdf.js")).default;

    await html2pdf()
      .set({
        margin: [topM, rightM, bottomM, leftM],
        filename: "document.pdf",
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: captureW,
          height: captureH,
          windowWidth: captureW,
          windowHeight: captureH,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc: Document) => {
            const node = clonedDoc.querySelector("[data-doctex-pdf-capture]");
            if (node instanceof HTMLElement) {
              node.style.left = "0";
              node.style.top = "0";
              node.style.position = "fixed";
              node.style.opacity = "1";
              node.style.zIndex = "2147483647";
              node.style.width = `${captureW}px`;
              node.style.minWidth = `${captureW}px`;
              node.style.maxWidth = `${captureW}px`;
              node.style.boxSizing = "border-box";
              node.style.overflow = "visible";
              node.style.background = "#ffffff";
            }
          },
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: layout.orientation === "landscape" ? "landscape" : "portrait",
        },
      })
      .from(shell)
      .save();
  } finally {
    document.body.removeChild(host);
  }
}

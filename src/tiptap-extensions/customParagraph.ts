import Paragraph from "@tiptap/extension-paragraph";
import { mergeAttributes } from "@tiptap/core";

function indentPadding(level: number): string {
  if (!level) return "";
  return `padding-left: ${level * 1.5}em`;
}

export const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      indent: {
        default: 0,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-indent");
          if (raw != null) {
            const n = parseInt(raw, 10);
            return Number.isFinite(n) ? Math.min(8, Math.max(0, n)) : 0;
          }
          const pl = element.style.paddingLeft;
          if (pl?.endsWith("em")) {
            const em = parseFloat(pl);
            return Math.min(8, Math.max(0, Math.round(em / 1.5)));
          }
          return 0;
        },
      },
      lineHeight: {
        default: null as string | null,
        parseHTML: (element) => element.style.lineHeight || null,
      },
      marginTop: {
        default: null as string | null,
        parseHTML: (element) => element.style.marginTop || null,
      },
      marginBottom: {
        default: null as string | null,
        parseHTML: (element) => element.style.marginBottom || null,
      },
      footnoteAnchor: {
        default: null as string | null,
        parseHTML: (element) => element.getAttribute("data-footnote-anchor"),
      },
      endnoteAnchor: {
        default: null as string | null,
        parseHTML: (element) => element.getAttribute("data-endnote-anchor"),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const { indent, lineHeight, marginTop, marginBottom, footnoteAnchor, endnoteAnchor } =
      node.attrs as {
        indent: number;
        lineHeight: string | null;
        marginTop: string | null;
        marginBottom: string | null;
        footnoteAnchor: string | null;
        endnoteAnchor: string | null;
      };
    const styleParts: string[] = [];
    if (indent) styleParts.push(indentPadding(indent));
    if (lineHeight) styleParts.push(`line-height: ${lineHeight}`);
    if (marginTop) styleParts.push(`margin-top: ${marginTop}`);
    if (marginBottom) styleParts.push(`margin-bottom: ${marginBottom}`);
    const style = styleParts.length ? styleParts.join("; ") : undefined;
    return [
      "p",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        ...(style ? { style } : {}),
        ...(indent ? { "data-indent": String(indent) } : {}),
        ...(footnoteAnchor ? { "data-footnote-anchor": footnoteAnchor } : {}),
        ...(endnoteAnchor ? { "data-endnote-anchor": endnoteAnchor } : {}),
      }),
      0,
    ];
  },
});

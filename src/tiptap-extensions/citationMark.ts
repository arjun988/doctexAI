import { Mark, mergeAttributes } from "@tiptap/core";

/** In-text citation mark; bibliography refresh walks these nodes */
export const Citation = Mark.create({
  name: "citation",
  inclusive: false,

  addAttributes() {
    return {
      citeKey: {
        default: "",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-cite-key") ?? "",
        renderHTML: (attrs) =>
          (attrs.citeKey as string) ? { "data-cite-key": attrs.citeKey } : {},
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-citation][data-cite-key]' },
      { tag: "span.doc-citation" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { class: "doc-citation", "data-citation": "true" },
        HTMLAttributes
      ),
      0,
    ];
  },
});

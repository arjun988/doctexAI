import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Mathematics from "./mathematicsExtension";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { CustomParagraph } from "./customParagraph";
import { Citation } from "./citationMark";
import { FontSize } from "./fontSize";
import { PageBreak } from "./pageBreak";

export function createEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      paragraph: false,
      heading: { levels: [1, 2, 3] },
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
    }),
    CustomParagraph,
    TextStyle,
    Color.configure({ types: ["textStyle"] }),
    FontFamily.configure({ types: ["textStyle"] }),
    FontSize.configure({ types: ["textStyle"] }),
    Underline,
    Subscript,
    Superscript,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { class: "doc-link" },
    }),
    Citation,
    Mathematics.configure({
      katexOptions: {
        throwOnError: false,
        errorColor: "#b91c1c",
        trust: false,
      },
      regex: /\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image.configure({ inline: true, allowBase64: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder }),
    PageBreak,
  ];
}

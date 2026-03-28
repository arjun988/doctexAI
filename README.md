# DocTex

**Try it:** [doctex-ai.vercel.app](https://doctex-ai.vercel.app/)

**DocTex** is a browser-based editor for serious long-form writing—papers, reports, and technical notes—where math, figures, and structure matter as much as the prose.

You work on one page: draft or import a document, use focused AI tools for grammar, formatting, math consistency, and manuscript-style layout, then export when you are ready. Bring your own API key; there is no account wall. Everything runs locally in the tab.

### What it helps you do

- **Write and edit** with a full rich-text workflow: headings, lists, tables, links, images, task lists, page breaks, and more.
- **Math** with proper notation that stays clean in the document and carries through when you export.
- **Import Word (.docx)** and keep working without losing the basics of your layout.
- **Page setup** you would expect from a document tool—margins, columns, orientation, headers and footers—reflected in PDF and LaTeX export.
- **Export** to HTML, Word, PDF, and LaTeX, with a preview before you download.
- **Assistant and agents** that target a selection, labeled context blocks, or the whole document—so you get structured edits back, not a generic chat dump.

DocTex is for people who want a single surface for drafting and polishing real documents, not a slide deck or a disposable note.

---

## Run and build

Use [Bun](https://bun.sh/) to install dependencies and run scripts.

```sh
bun install
```

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the app in development |
| `bun run build` | Create a production build |
| `bun run start` | Run the production server (after `build`) |

Default dev URL: `http://localhost:3000`.

import Image from "next/image";
import Link from "next/link";

const agents = [
  {
    name: "Fix grammar",
    blurb:
      "Tighten phrasing and mechanics while preserving your voice—ideal for drafts imported from Word or typed from scratch.",
  },
  {
    name: "Clean formatting",
    blurb:
      "Turn dense text into clear paragraphs, lists, and headings without changing what you meant to say.",
  },
  {
    name: "Math",
    blurb:
      "Keep KaTeX-LaTeX consistent: inline and display equations, symbols, and notation that stays readable when you export.",
  },
  {
    name: "Research paper",
    blurb:
      "Apply journal-style structure: typography, spacing, abstracts, captions, and bibliography cues (IEEE, APA, MLA) as editable HTML.",
  },
];

const capabilities = [
  "Import Word (.docx) and keep working in the browser",
  "Page setup: columns, margins, orientation, header & footer—honored in PDF and LaTeX export",
  "Export HTML, Word, PDF, and LaTeX with a live preview before you download",
  "Rich editor: tables, links, images, task lists, page breaks, and a full math workflow",
  "Assistant uses your selection, context blocks, and the full document when you want it to",
  "Bring your own API key; no account wall",
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#171717] antialiased selection:bg-[#1c1917]/8">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7 sm:px-10">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-[#0c0c0c] transition opacity-90 hover:opacity-100"
        >
          DocTex
        </Link>
        <Link
          href="/editor"
          className="rounded-full bg-[#0c0c0c] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black"
        >
          Open editor
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-4 sm:px-10 sm:pb-24 sm:pt-6">
          <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#78716c]">
            Documents, math, export
          </p>
          <h1 className="mt-5 max-w-3xl font-landing-serif text-[2.35rem] font-normal leading-[1.06] tracking-[-0.02em] text-[#0c0c0c] sm:text-5xl sm:leading-[1.04] lg:text-[3.1rem]">
            Write seriously. Let specialized agents handle the tedious parts.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#44403c] sm:text-[1.125rem]">
            One surface for long-form work: equations and figures beside an assistant that knows grammar, structure,
            math, and manuscript conventions—then ship to HTML, Word, PDF, or LaTeX.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link
              href="/editor"
              className="inline-flex w-fit items-center justify-center rounded-full bg-[#0c0c0c] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-black"
            >
              Start writing
            </Link>
            <p className="text-sm text-[#78716c]">Your key · No account · Runs in the browser</p>
          </div>
        </section>

        <section className="border-y border-[#e7e5e4] bg-[#f5f4f1] px-6 py-14 sm:px-10">
          <div className="mx-auto max-w-6xl">
            <p className="text-center font-landing-serif text-lg text-[#0c0c0c] sm:text-xl">
              The editor
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-[#57534e]">
              Math in the page, charts in place, and the assistant panel—same layout you use for real papers and reports.
            </p>
            <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-2xl border border-[#e7e5e4] bg-[#1c1917] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
              <Image
                src="/landing-editor.png"
                alt="DocTex document editor with formatting toolbar, mathematical content, figures, and AI assistant sidebar"
                width={1920}
                height={1000}
                className="h-auto w-full object-contain object-top"
                sizes="(max-width: 640px) 100vw, 672px"
                quality={92}
                priority
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          <div className="max-w-xl">
            <h2 className="font-landing-serif text-2xl font-normal text-[#0c0c0c] sm:text-[1.75rem]">
              Agents that stay on task
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#57534e]">
              Slash-commands and one-click tools route the model with tight instructions—so you get structured HTML
              back, not a chat essay. Use them on a highlight or the whole document.
            </p>
          </div>
          <ul className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-12">
            {agents.map((a) => (
              <li key={a.name}>
                <h3 className="text-sm font-semibold text-[#0c0c0c]">{a.name}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#57534e]">{a.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-[#e7e5e4] bg-white px-6 py-20 sm:px-10">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-landing-serif text-2xl font-normal text-[#0c0c0c] sm:text-[1.75rem]">
              What you get
            </h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-4">
              {capabilities.map((line) => (
                <li key={line} className="flex gap-3 text-[15px] leading-snug text-[#44403c]">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#0c0c0c]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24 text-center sm:px-10">
          <p className="font-landing-serif text-2xl font-normal text-[#0c0c0c] sm:text-[1.85rem]">
            Try the editor
          </p>
          <Link
            href="/editor"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-[#d6d3d1] bg-transparent px-7 py-3.5 text-sm font-medium text-[#0c0c0c] transition hover:border-[#a8a29e] hover:bg-[#faf9f7]"
          >
            Open DocTex
          </Link>
        </section>

        <footer className="border-t border-[#e7e5e4] px-6 py-10 sm:px-10">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 text-sm text-[#78716c] sm:flex-row sm:items-center">
            <span className="font-medium text-[#44403c]">DocTex</span>
            <span className="text-[13px]">Serious documents, minimal friction.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

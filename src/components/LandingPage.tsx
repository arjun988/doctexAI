import Link from "next/link";

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v3m0 12v3M4.6 12h3m8.8 0h3M6.3 6.3l2.1 2.1m7.2 7.2l2.1 2.1m0-11.4l-2.1 2.1M8.4 15.6l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function IconFileUp({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6M12 17V8m0 0l-2.5 2.5M12 8l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFileText({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f5f2] text-[#111111] antialiased selection:bg-[#1a1a1a]/10">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-[#0a0a0a] opacity-90 transition hover:opacity-100"
        >
          DocTex
        </Link>
        <Link
          href="/editor"
          className="rounded-full bg-[#141414] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-black"
        >
          Open editor
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-16">
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#6b6358]">
            Documents · AI
          </p>
          <h1 className="mt-6 max-w-[18ch] font-landing-serif text-[2.5rem] font-normal leading-[1.08] text-[#0a0a0a] sm:max-w-none sm:text-5xl sm:leading-[1.06] lg:text-[3.35rem]">
            A calm place to write, edit, and refine.
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-[#45413a] sm:text-xl sm:leading-relaxed">
            Import Word, shape your draft with an assistant beside you, and export when you are
            ready — without leaving the browser.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/editor"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#141414] px-7 py-3.5 text-sm font-medium text-white transition hover:bg-black"
            >
              Start writing
              <IconArrowRight className="opacity-90" />
            </Link>
            <p className="text-sm text-[#6b6358]">No account required · Your key, your model</p>
          </div>
        </section>

        <section className="border-t border-[#e5e0d8] bg-[#faf9f7] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-landing-serif text-2xl font-normal text-[#0a0a0a] sm:text-[1.65rem]">
              Everything you need for serious documents.
            </p>
            <ul className="mt-14 grid gap-12 sm:grid-cols-3 sm:gap-10">
              <li className="max-w-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e0dbd3] bg-[#f7f5f2] text-[#2d2a26]">
                  <IconSparkles />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-[#0a0a0a]">Assistant panel</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#555046]">
                  Context blocks, selection-aware edits, and tools for grammar, structure, math, and
                  research-style formatting.
                </p>
              </li>
              <li className="max-w-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e0dbd3] bg-[#f7f5f2] text-[#2d2a26]">
                  <IconFileUp />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-[#0a0a0a]">Word in and out</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#555046]">
                  Bring in .docx files and export to HTML, Word, or PDF with your page layout in
                  mind.
                </p>
              </li>
              <li className="max-w-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e0dbd3] bg-[#f7f5f2] text-[#2d2a26]">
                  <IconFileText />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-[#0a0a0a]">Rich editing</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#555046]">
                  Tables, links, typography, equations with KaTeX — tuned for long-form work.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="border-t border-[#e5e0d8] px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="font-landing-serif text-2xl font-normal text-[#0a0a0a] sm:text-[1.75rem]">
              Ready when you are.
            </p>
            <Link
              href="/editor"
              className="mt-8 inline-flex items-center justify-center rounded-full border border-[#cfc9be] bg-transparent px-7 py-3.5 text-sm font-medium text-[#0a0a0a] transition hover:border-[#b0aaa0] hover:bg-[#f0ede7]"
            >
              Open the editor
            </Link>
          </div>
        </section>

        <footer className="border-t border-[#e5e0d8] px-5 py-10 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 text-sm text-[#6b6358] sm:flex-row sm:items-center">
            <span>DocTex</span>
            <span className="text-[13px]">Focused writing in the browser.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

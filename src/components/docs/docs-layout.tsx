import Link from "next/link";
import { docNav, docSections } from "@/lib/docs/content";

export function DocsLayout() {
  return (
    <div className="site-offset min-h-[70vh] bg-page-background pb-20">
      <div className="container py-10 md:py-14">
        <header className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            Documentation
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-normal tracking-tight mt-2">
            ThesisX Docs
          </h1>
          <p className="text-muted text-sm md:text-base mt-4 leading-relaxed">
            Everything you need to create AI-managed funds, use SoSoValue
            intelligence, approve execution, rebalance, and follow strategies on
            ThesisX.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/create" className="hero-cta-primary">
              Get Started
            </Link>
            <Link href="/dashboard" className="hero-cta-secondary">
              Open Dashboard
            </Link>
          </div>
        </header>

        <div className="mt-12 grid lg:grid-cols-[220px_1fr] gap-10 items-start">
          <nav
            className="dashboard-panel lg:sticky lg:top-24 hidden lg:block"
            aria-label="Documentation sections"
          >
            <div className="dashboard-panel-body py-4">
              <ul className="space-y-1 text-sm">
                {docNav.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block rounded-lg px-3 py-2 text-muted hover:text-foreground hover:bg-elevated transition-colors"
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="min-w-0 space-y-10">
            {docSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="dashboard-panel scroll-mt-28"
              >
                <div className="dashboard-panel-header">
                  <h2 className="font-display text-2xl font-normal tracking-tight">
                    {section.title}
                  </h2>
                </div>
                <div className="dashboard-panel-body prose-docs space-y-4 text-sm leading-relaxed text-muted">
                  {section.paragraphs?.map((p) => (
                    <p key={p.slice(0, 24)} className="text-foreground/90">
                      {p}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="list-disc pl-5 space-y-2">
                      {section.bullets.map((b) => (
                        <li key={b.slice(0, 32)}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {section.subsections?.map((sub) => (
                    <div key={sub.title} className="pt-2">
                      <h3 className="text-foreground font-medium mb-2">
                        {sub.title}
                      </h3>
                      <ul className="list-disc pl-5 space-y-1.5">
                        {sub.body.map((line) => (
                          <li key={line.slice(0, 32)}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

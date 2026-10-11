import { SkipLink } from '@/components/skip-link';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    n: '01',
    title: 'Say who you want',
    body: 'Set industries, countries, size, and revenue. Raise a weight to matter more. Turn on a strict rule only when a known mismatch should drop the lead.',
  },
  {
    n: '02',
    title: 'Read the ranked list',
    body: 'Every matching company is scored, then sorted. High fit sits at the top. Missing data is marked for review, not treated as a no.',
  },
  {
    n: '03',
    title: 'Queue only the good names',
    body: 'Select leads and add them to the enrichment queue. The credit count is an estimate. Already-queued names are skipped as duplicates.',
  },
  {
    n: '04',
    title: 'Run simulated enrichment',
    body: 'Enrichment here is fake. No provider is called and no real credit is spent. A lead with no website domain fails, because a real provider would have nothing to match.',
  },
] as const;

const TERMS = [
  {
    term: 'Fit score',
    def: 'A 0 to 100 number from known factors only. It is a fit heuristic, not a close rate.',
  },
  {
    term: 'Priority',
    def: 'High, medium, or low when the score is usable. Needs review when data is missing. Disqualified when a strict rule is broken.',
  },
  {
    term: 'Confidence',
    def: 'How much of your profile had real data. Low confidence means you should look before you spend.',
  },
  {
    term: 'Strict rule',
    def: 'A known mismatch fails. An unknown value does not. Those leads go to review instead.',
  },
] as const;

export function LandingPage() {
  return (
    <div className="landing min-h-dvh">
      <SkipLink />
      <div className="app-grain" aria-hidden />
      <div className="h-0.5 bg-primary" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0 sm:pt-[max(0px,env(safe-area-inset-top))]">
          <a href="/" className="flex min-w-0 items-center gap-3 no-underline">
            <span className="rounded-sm border border-primary px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-[0.2em] text-primary">
              SEQ
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              Smart Enrichment Queue
            </span>
          </a>
          <nav className="flex flex-wrap items-center gap-3" aria-label="Landing">
            <a
              href="#the-problem"
              className="inline-flex min-h-11 items-center rounded-sm px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              The problem
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center rounded-sm px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              How it works
            </a>
            <Button asChild className="min-h-11">
              <a href="/?view=leads">Open the workspace</a>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="relative mx-auto max-w-5xl overflow-x-clip px-4 pt-12 pb-20 md:pt-20">
          <p
            className="landing-reveal font-mono text-[11px] tracking-[0.28em] text-primary uppercase"
            style={{ animationDelay: '40ms' }}
          >
            Folio 01 · The guess
          </p>
          <div className="relative mt-5">
            <span
              aria-hidden
              className="landing-reveal pointer-events-none absolute -end-6 -top-10 hidden select-none font-mono text-[11rem] leading-none font-medium text-primary/15 md:block"
              style={{ animationDelay: '120ms' }}
            >
              01
            </span>
            <h1
              className="landing-reveal relative max-w-[18ch] text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              Stop guessing which leads deserve your credits.
            </h1>
          </div>
          <p
            className="landing-reveal mt-6 max-w-[40ch] text-base leading-relaxed text-muted-foreground"
            style={{ animationDelay: '160ms' }}
          >
            Finding hundreds of potential leads is easy. Knowing which ones are worth your time and
            enrichment credits is the hard part.
          </p>
          <div
            className="landing-reveal mt-8 flex flex-wrap gap-3"
            style={{ animationDelay: '220ms' }}
          >
            <Button asChild className="min-h-11">
              <a href="/?view=leads">Open the workspace</a>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <a href="#how-it-works">See the four steps</a>
            </Button>
          </div>
        </section>

        <section id="the-problem" className="scroll-mt-24">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <p className="font-mono text-[11px] tracking-[0.28em] text-primary uppercase">
              Folio 02 · The spend
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              When every scraped company looks like an opportunity
            </h2>
            <div className="mt-6 max-w-[62ch] space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Teams are left sorting through incomplete data, manually comparing prospects, and
                guessing which leads are most likely to fit their ideal customer profile. Without a
                clear way to prioritize, valuable credits get spent on poor-fit companies while
                high-potential opportunities go unnoticed.
              </p>
              <p className="text-foreground">
                Smart Enrichment Queue turns that list into a prioritized, explainable action plan.
                You focus research and enrichment on the companies that already fit.
              </p>
              <p>
                Enrichment here is simulated. No provider is called and no real credit is spent. The
                decision is the same as production: do not buy a profile until the company already
                looks like a customer.
              </p>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div>
                <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
                  Without
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">Guess, then spend</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Incomplete rows get compared by hand. Credits go to poor fits. Stronger names sit
                  unnoticed in the dump.
                </p>
              </div>
              <div className="border-s-2 border-primary ps-6">
                <p className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase">
                  With this queue
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">Rank, then act</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Every company is scored on known data, with missing fields marked for review. You
                  queue only the names that already look like a fit.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-card">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <p className="font-mono text-[11px] tracking-[0.28em] text-primary uppercase">
              Folio 03 · The run
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              How you use it
            </h2>
            <p className="mt-3 max-w-[50ch] text-sm leading-relaxed text-muted-foreground">
              Work in this order: profile, ranked list, queue. Nothing is spent until you press
              enrich, and even then the run is simulated.
            </p>
            <ol className="mt-10">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-6 gap-y-1 py-7 not-first:border-t not-first:border-border md:grid-cols-[5.5rem_minmax(0,16rem)_minmax(0,1fr)]"
                >
                  <span className="font-mono text-4xl leading-none font-medium text-primary/80 tabular-nums md:text-5xl">
                    {step.n}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="col-start-2 mt-1 text-sm leading-relaxed text-muted-foreground md:col-start-3 md:row-start-1 md:mt-0">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <p className="font-mono text-[11px] tracking-[0.28em] text-primary uppercase">
            Folio 04 · The key
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            What the labels mean
          </h2>
          <dl className="mt-10 space-y-8">
            {TERMS.map((item) => (
              <div
                key={item.term}
                className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-baseline sm:gap-10"
              >
                <dt className="font-mono text-sm font-medium tracking-tight">{item.term}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{item.def}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-primary/30">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16 pb-[max(4rem,env(safe-area-inset-bottom))] md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] tracking-[0.28em] text-primary uppercase">
                Colophon
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">This is a demo</h2>
              <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
                Companies are synthetic. Enrichment is simulated. Every visitor shares one demo
                user. Do not put real customer data here.
              </p>
            </div>
            <Button asChild className="min-h-11">
              <a href="/?view=leads">Open the workspace</a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

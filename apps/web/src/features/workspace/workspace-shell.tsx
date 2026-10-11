import { ListChecksIcon, TargetIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ErrorAlert } from '@/components/error-alert';
import { SkipLink } from '@/components/skip-link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadsWorkspace } from '@/features/leads/leads-workspace';
import { useMeta } from '@/features/leads/use-leads';
import { WorkspaceSkeleton } from '@/features/leads/workspace-skeleton';
import { QueueView } from '@/features/queue/queue-view';
import { useQueueSummary } from '@/features/queue/use-queue';

export type WorkspaceView = 'leads' | 'queue';

const sidebarNavButton =
  'min-h-11 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground';

const sidebarNavActive =
  'bg-sidebar-primary font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground';

const sidebarTab =
  'group h-auto min-h-11 justify-start rounded-sm px-2 py-2 text-start text-sm font-medium text-sidebar-foreground transition-[color,background-color] duration-150 ease-out hover:bg-sidebar-accent hover:text-sidebar-foreground after:hidden data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground dark:text-sidebar-foreground dark:hover:text-sidebar-foreground dark:data-active:bg-sidebar-primary dark:data-active:text-sidebar-primary-foreground';

const navCount =
  'rounded-sm bg-sidebar-primary px-1.5 font-mono text-xs text-sidebar-primary-foreground tabular-nums group-data-active:bg-sidebar-primary-foreground/20 group-data-active:text-sidebar-primary-foreground';

export function readWorkspaceView(): WorkspaceView {
  return new URLSearchParams(window.location.search).get('view') === 'queue' ? 'queue' : 'leads';
}

export function WorkspaceShell() {
  const [view, setView] = useState<WorkspaceView>(readWorkspaceView);
  const meta = useMeta();
  const queuedCount = useQueueSummary().data?.byStatus.queued ?? 0;

  const changeView = (next: WorkspaceView) => {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set('view', next);
    window.history.replaceState(null, '', url);
  };

  return (
    <div className="h-dvh overflow-hidden overscroll-none">
      <SkipLink />
      <div className="app-grain" aria-hidden />
      <Tabs
        value={view}
        onValueChange={(next) => changeView(next === 'queue' ? 'queue' : 'leads')}
        orientation="vertical"
        className="flex h-dvh flex-col gap-0 overflow-hidden lg:flex-row"
      >
        <header className="z-20 flex min-h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 pt-[max(0px,env(safe-area-inset-top))] text-sidebar-foreground lg:hidden">
          <a
            href="/"
            className="shrink-0 rounded-sm border border-sidebar-primary px-1.5 py-0.5 font-mono text-[11px] tracking-[0.2em] text-sidebar-primary"
          >
            SEQ
          </a>
          <nav className="flex min-w-0 flex-1 gap-3 overflow-x-auto" aria-label="Workspace">
            <Button
              variant="ghost"
              size="sm"
              aria-current={view === 'leads' ? 'page' : undefined}
              className={cn(sidebarNavButton, view === 'leads' && sidebarNavActive)}
              onClick={() => changeView('leads')}
            >
              <TargetIcon /> Leads
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-current={view === 'queue' ? 'page' : undefined}
              className={cn(sidebarNavButton, view === 'queue' && sidebarNavActive)}
              onClick={() => changeView('queue')}
            >
              <ListChecksIcon /> Queue
              {queuedCount > 0 && (
                <span
                  className={
                    view === 'queue'
                      ? 'rounded-sm bg-sidebar-primary-foreground/20 px-1.5 font-mono text-xs text-sidebar-primary-foreground tabular-nums'
                      : 'rounded-sm bg-sidebar-primary px-1.5 font-mono text-xs text-sidebar-primary-foreground tabular-nums'
                  }
                >
                  {queuedCount}
                </span>
              )}
            </Button>
          </nav>
          <Button asChild variant="ghost" size="sm" className={sidebarNavButton}>
            <a href="/">Guide</a>
          </Button>
        </header>

        <aside className="hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-e border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
          <p className="w-fit rounded-sm border border-sidebar-primary px-1.5 py-0.5 font-mono text-[11px] tracking-[0.2em] text-sidebar-primary">
            SEQ
          </p>
          <h1 className="mt-2 text-[1.35rem] leading-[1.15] font-semibold tracking-tight">
            Smart Enrichment Queue
          </h1>
          <p className="mt-2 max-w-[18ch] text-xs leading-relaxed text-sidebar-foreground/80">
            Stop guessing which leads deserve a credit.
          </p>

          <TabsList className="mt-8 w-full items-stretch bg-transparent p-0">
            <TabsTrigger value="leads" className={sidebarTab}>
              <TargetIcon /> Prioritize leads
            </TabsTrigger>
            <TabsTrigger value="queue" className={sidebarTab}>
              <ListChecksIcon /> Enrichment queue
              {queuedCount > 0 && <span className={`ms-auto ${navCount}`}>{queuedCount}</span>}
            </TabsTrigger>
          </TabsList>

          <a
            href="/"
            className="mt-6 text-sm font-medium text-sidebar-foreground underline-offset-4 hover:underline"
          >
            How this works
          </a>
          <p className="mt-auto border-t border-sidebar-border pt-4 font-mono text-xs leading-relaxed text-sidebar-foreground/80">
            Demo. Synthetic companies. Simulated enrichment. One demo user.
          </p>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <main
            id="main"
            className="mx-auto flex h-full min-h-0 w-full max-w-[1480px] flex-1 flex-col overflow-hidden px-4 py-4"
          >
            {meta.isError && (
              <div className="shrink-0">
                <ErrorAlert error={meta.error} onRetry={() => void meta.refetch()} />
              </div>
            )}
            {meta.isPending && <WorkspaceSkeleton />}
            {meta.data && (
              <>
                <TabsContent
                  value="leads"
                  forceMount
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
                >
                  <LeadsWorkspace meta={meta.data} onOpenQueue={() => changeView('queue')} />
                </TabsContent>
                <TabsContent
                  value="queue"
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <QueueView onBrowseLeads={() => changeView('leads')} />
                </TabsContent>
              </>
            )}
          </main>
        </div>
      </Tabs>
    </div>
  );
}

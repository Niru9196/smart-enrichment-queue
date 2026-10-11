import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, Loader2Icon, PlusIcon, SearchIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { PRIORITY_STYLES } from '@/components/badges';
import { ErrorAlert } from '@/components/error-alert';
import { ExportButton } from '@/components/export-button';
import { Pagination } from '@/components/pagination';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueueSummary } from '@/features/queue/use-queue';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { PRIORITIES, type Criteria, type LeadFilters, type Meta } from '@/lib/api-schemas';
import { criteriaSchema } from '@/lib/criteria-schema';
import { FilterSelect } from './filter-select';
import { IcpSettings } from './icp-settings';
import { LeadDetailSheet } from './lead-detail-sheet';
import { LeadTable } from './lead-table';
import { OverviewStrip } from './overview-strip';
import {
  useAddToQueue,
  useExportLeads,
  usePreferences,
  useRankedLeads,
  useSavePreferences,
} from './use-leads';
import { WorkspaceSkeleton } from './workspace-skeleton';

const PAGE_SIZE = 25;

export function LeadsWorkspace({ meta, onOpenQueue }: { meta: Meta; onOpenQueue?: () => void }) {
  const preferences = usePreferences();
  if (!preferences.data) {
    return preferences.isError ? (
      <ErrorAlert error={preferences.error} onRetry={() => void preferences.refetch()} />
    ) : (
      <WorkspaceSkeleton />
    );
  }
  return <Workspace meta={meta} saved={preferences.data.criteria} onOpenQueue={onOpenQueue} />;
}

function Workspace({
  meta,
  saved,
  onOpenQueue,
}: {
  meta: Meta;
  saved: Criteria;
  onOpenQueue?: () => void;
}) {
  const form = useForm<Criteria>({
    resolver: zodResolver(criteriaSchema),
    mode: 'onChange',
    values: saved,
  });
  const draft = useWatch({ control: form.control });
  const isDirty = form.formState.isDirty;
  const debouncedDraft = useDebouncedValue(draft, 350);
  const parsedDraft = criteriaSchema.safeParse(debouncedDraft);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Omit<LeadFilters, 'q'>>({});
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);
  const effectiveFilters: LeadFilters = { ...filters, q: q || undefined };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const leads = useRankedLeads({
    filters: effectiveFilters,
    page,
    pageSize: PAGE_SIZE,
    isPreview: isDirty,
    previewCriteria: parsedDraft.data,
  });
  const queueSummary = useQueueSummary();
  const save = useSavePreferences();
  const add = useAddToQueue();
  const exportLeads = useExportLeads();

  const data = leads.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  // A preview or a refetch can shrink the result set and leave the current page past the end.
  if (data && !leads.isPlaceholderData && page > totalPages) setPage(totalPages);
  const openLead = data?.items.find((l) => l.company.id === openLeadId) ?? null;
  const hasFilters = Boolean(
    search.trim() || filters.industry || filters.country || filters.priority,
  );

  const updateFilter = (patch: Partial<Omit<LeadFilters, 'q'>>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const clearFilters = () => {
    setSearch('');
    setFilters({});
    setPage(1);
  };

  const highOnPage =
    data?.items
      .filter((l) => l.scoring.priority === 'high' && l.queueStatus === null)
      .map((l) => l.company.id) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8">
      <div className="shrink-0 lg:hidden">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setShowProfile((open) => !open)}
          aria-expanded={showProfile}
        >
          {showProfile ? 'Hide who you want' : 'Edit who you want'}
          <span className="text-xs text-muted-foreground">ICP</span>
        </Button>
      </div>
      <aside
        className={
          showProfile
            ? 'min-h-0 max-h-[36dvh] overflow-y-auto rounded-lg border border-border bg-card px-4 pt-4 lg:h-full lg:max-h-none'
            : 'hidden min-h-0 overflow-y-auto rounded-lg border border-border bg-card px-4 pt-4 lg:block lg:h-full'
        }
      >
        <IcpSettings
          form={form}
          industries={meta.industries}
          countries={meta.countries}
          isDirty={isDirty}
          isValid={form.formState.isValid}
          isSaving={save.isPending}
          onSave={() => {
            const parsed = criteriaSchema.safeParse(form.getValues());
            if (parsed.success) save.mutate(parsed.data);
          }}
          onDiscard={() => form.reset(saved)}
        />
      </aside>

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden"
        aria-label="Ranked leads"
      >
        <div className="shrink-0 space-y-3">
          <OverviewStrip
            summary={data?.summary}
            queue={queueSummary.data}
            isLeadsLoading={leads.isPending}
            isQueueLoading={queueSummary.isPending}
            activePriority={filters.priority}
            onPriority={(priority) => updateFilter({ priority })}
            onQueued={onOpenQueue}
          />

          {isDirty && (
            <Alert className="border-primary/30 bg-primary/8">
              <EyeIcon />
              <AlertDescription className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">Previewing unsaved profile changes.</span>
                {parsedDraft.success
                  ? 'Rankings below reflect your edits. Save to apply them to the queue and exports.'
                  : 'Fix the highlighted settings to update the preview.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Search companies"
                placeholder="Search name or domain"
                className="ps-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <FilterSelect
              label="Industry"
              value={filters.industry}
              options={meta.industries.map((v) => ({ value: v, label: v }))}
              onChange={(industry) => updateFilter({ industry })}
            />
            <FilterSelect
              label="Country"
              value={filters.country}
              options={meta.countries.map((v) => ({ value: v, label: v }))}
              onChange={(country) => updateFilter({ country })}
            />
            <FilterSelect
              label="Priority"
              value={filters.priority}
              options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_STYLES[p].label }))}
              onChange={(value) => updateFilter({ priority: PRIORITIES.find((p) => p === value) })}
            />
            <ExportButton
              onExport={() => exportLeads.mutate(effectiveFilters)}
              isPending={exportLeads.isPending}
              disabledReason={isDirty ? 'Save or discard profile changes to export' : undefined}
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <XIcon /> Clear filters
              </Button>
            )}
          </div>

          <div
            className={
              selected.size > 0
                ? 'flex min-h-9 flex-wrap items-center gap-2 rounded-sm bg-primary/8 px-2.5 py-1.5 text-sm'
                : 'flex min-h-9 flex-wrap items-center gap-2 text-sm'
            }
          >
            {selected.size > 0 ? (
              <>
                <span className="font-medium">{selected.size} selected</span>
                <Button
                  size="sm"
                  // Selection is kept on failure so the user can retry; adding again is duplicate-safe.
                  onClick={() =>
                    add.mutate([...selected], { onSuccess: () => setSelected(new Set()) })
                  }
                  disabled={add.isPending}
                >
                  {add.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
                  Add to queue ({selected.size * meta.creditsPerEnrichment} credits est.)
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  <XIcon /> Clear
                </Button>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">
                  Select leads to queue them for enrichment, or
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={highOnPage.length === 0 || add.isPending}
                  title={
                    highOnPage.length === 0
                      ? 'No high-fit leads on this page that can be queued'
                      : undefined
                  }
                  onClick={() => add.mutate(highOnPage)}
                >
                  <PlusIcon /> Queue all high-fit on this page ({highOnPage.length})
                </Button>
              </>
            )}
            {leads.isFetching && (
              <Loader2Icon
                className="ms-auto size-4 animate-spin text-muted-foreground"
                aria-label="Updating"
              />
            )}
          </div>

          {leads.isError && <ErrorAlert error={leads.error} onRetry={() => void leads.refetch()} />}
        </div>

        {/* On a failed first load the alert stands alone; an empty table would read as "no matches". */}
        {(data || !leads.isError) && (
          <LeadTable
            className="min-h-0 flex-1"
            items={data?.items ?? []}
            isLoading={leads.isPending}
            isRefreshing={leads.isPlaceholderData}
            onClearFilters={hasFilters ? clearFilters : undefined}
            selected={selected}
            onToggle={(id) =>
              setSelected((s) => {
                const next = new Set(s);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onToggleAll={(ids, select) =>
              setSelected((s) => {
                const next = new Set(s);
                for (const id of ids) {
                  if (select) next.add(id);
                  else next.delete(id);
                }
                return next;
              })
            }
            onOpen={(lead) => setOpenLeadId(lead.company.id)}
          />
        )}

        {data && data.total > 0 && (
          <div className="shrink-0">
            <Pagination
              label="Pagination"
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            >
              <span className="text-muted-foreground">
                Showing {(data.page - 1) * PAGE_SIZE + 1} to{' '}
                {Math.min(data.page * PAGE_SIZE, data.total)} of {data.total}
                <span className="ms-2 text-xs">* AI revenue estimate</span>
              </span>
            </Pagination>
          </div>
        )}
      </section>

      <LeadDetailSheet
        lead={openLead}
        isPreview={isDirty}
        onOpenChange={(open) => !open && setOpenLeadId(null)}
        onAddToQueue={(id) => add.mutate([id])}
        isAdding={add.isPending}
      />
    </div>
  );
}

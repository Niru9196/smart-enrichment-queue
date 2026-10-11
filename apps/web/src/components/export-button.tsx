import { DownloadIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExportButton({
  onExport,
  isPending,
  disabledReason,
}: {
  onExport: () => void;
  isPending: boolean;
  /** When set, the button is disabled and the reason is shown as its title. */
  disabledReason?: string;
}) {
  return (
    <Button
      variant="outline"
      onClick={onExport}
      disabled={Boolean(disabledReason) || isPending}
      title={disabledReason}
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
      Export CSV
    </Button>
  );
}

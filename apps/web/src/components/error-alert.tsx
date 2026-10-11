import { AlertCircleIcon, RotateCcwIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { userMessage } from '@/services/http';

export function ErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{userMessage(error)}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCcwIcon /> Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcwIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  hasError: boolean;
}

/** Last-resort fallback for render errors, so a bug shows a recovery action, not a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Message and component stack only; never the data being rendered.
    console.error('render_error', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="mx-auto mt-24 max-w-md space-y-3 px-4 text-center">
        <TriangleAlertIcon className="mx-auto size-8 text-destructive" aria-hidden />
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          The page hit an unexpected error. Saved data is safe; unsaved profile edits may be lost.
        </p>
        <Button onClick={() => window.location.reload()}>
          <RotateCcwIcon /> Reload the page
        </Button>
      </div>
    );
  }
}

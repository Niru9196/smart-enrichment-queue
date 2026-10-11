import { cn } from 'cn';

// Shimmer instead of pulse. Under prefers-reduced-motion the global rule in index.css stops the
// sweep, leaving a static placeholder.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md bg-foreground/8',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-linear-to-r before:from-transparent before:via-white/70 before:to-transparent',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

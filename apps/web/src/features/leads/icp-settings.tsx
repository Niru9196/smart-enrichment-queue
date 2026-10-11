import { Loader2Icon, RotateCcwIcon, SaveIcon } from 'lucide-react';
import { useId } from 'react';
import { Controller, useFormState, type Control, type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { Criteria } from '@/lib/api-schemas';
import { cn } from '@/lib/utils';

interface Props {
  form: UseFormReturn<Criteria>;
  industries: string[];
  countries: string[];
  isDirty: boolean;
  isValid: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function IcpSettings({
  form,
  industries,
  countries,
  isDirty,
  isValid,
  isSaving,
  onSave,
  onDiscard,
}: Props) {
  const { control } = form;
  const formState = useFormState({ control });
  const rootError = formState.errors.root?.message;

  return (
    <form
      aria-label="Ideal customer profile"
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div>
        <h2 className="text-sm font-semibold">Ideal customer profile</h2>
        <p className="text-xs text-muted-foreground">
          Weights shape the fit score. Strict rules disqualify known mismatches; unknown values go
          to review instead.
        </p>
      </div>

      <FactorSection title="Industry" control={control} name="industry">
        <ChipSelect
          control={control}
          name="industry.values"
          options={industries}
          label="Target industries"
        />
      </FactorSection>
      <FactorSection title="Location" control={control} name="location">
        <ChipSelect
          control={control}
          name="location.values"
          options={countries}
          label="Target countries"
        />
      </FactorSection>
      <FactorSection title="Company size" control={control} name="size">
        <RangeInputs
          control={control}
          name="size"
          unit="employees"
          scale={1}
          error={formState.errors.size?.max?.message}
        />
      </FactorSection>
      <FactorSection title="Revenue" control={control} name="revenue">
        <RangeInputs
          control={control}
          name="revenue"
          unit="USD millions"
          scale={1_000_000}
          error={formState.errors.revenue?.max?.message}
        />
      </FactorSection>
      <FactorSection
        title="Data completeness"
        control={control}
        name="completeness"
        hint="Rewards records with domain, industry, location, size, revenue, and LinkedIn present."
      />

      <FieldError message={rootError} />

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Button type="submit" className="flex-1" disabled={!isDirty || isSaving || !isValid}>
          {isSaving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          Save profile
        </Button>
        <Button type="button" variant="outline" disabled={!isDirty || isSaving} onClick={onDiscard}>
          <RotateCcwIcon />
          Discard
        </Button>
      </div>
    </form>
  );
}

function FactorSection({
  title,
  control,
  name,
  hint,
  children,
}: {
  title: string;
  control: Control<Criteria>;
  name: keyof Criteria;
  hint?: string;
  children?: React.ReactNode;
}) {
  const id = useId();
  return (
    <fieldset className="space-y-3" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="sr-only">{title}</legend>
      <Controller
        control={control}
        name={`${name}.weight`}
        render={({ field }) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{title}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {Number(field.value) === 0 ? 'Ignored' : `Weight ${String(field.value)}`}
              </span>
            </div>
            <Slider
              thumbLabel={`${title} weight`}
              min={0}
              max={10}
              step={1}
              value={[Number(field.value)]}
              onValueChange={([v]) => field.onChange(v)}
            />
          </div>
        )}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
      {name !== 'completeness' && (
        <Controller
          control={control}
          name={`${name}.strict`}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch
                id={`${id}-strict`}
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor={`${id}-strict`} className="text-xs font-normal">
                Strict rule: disqualify known mismatches
              </Label>
            </div>
          )}
        />
      )}
    </fieldset>
  );
}

function ChipSelect({
  control,
  name,
  options,
  label,
}: {
  control: Control<Criteria>;
  name: 'industry.values' | 'location.values';
  options: string[];
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selected = new Set(field.value);
        // Keep previously saved values visible even if no seeded company uses them.
        const all = [...new Set([...options, ...field.value])];
        if (all.length === 0) {
          return (
            <p className="text-xs text-muted-foreground">
              No values to choose from yet; they come from the imported companies.
            </p>
          );
        }
        return (
          <div role="group" aria-label={label} className="flex flex-wrap gap-2">
            {all.map((option) => {
              const active = selected.has(option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    field.onChange(
                      active ? field.value.filter((v) => v !== option) : [...field.value, option],
                    )
                  }
                  className={cn(
                    'min-h-8 rounded-full border px-2.5 py-0.5 text-xs transition-[color,background-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted',
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        );
      }}
    />
  );
}

function RangeInputs({
  control,
  name,
  unit,
  scale,
  error,
}: {
  control: Control<Criteria>;
  name: 'size' | 'revenue';
  unit: string;
  scale: number;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const bound = (which: 'min' | 'max') => (
    <Controller
      control={control}
      name={`${name}.${which}`}
      render={({ field }) => (
        <div className="flex-1 space-y-1">
          <Label htmlFor={`${id}-${which}`} className="text-xs font-normal text-muted-foreground">
            {which === 'min' ? 'Min' : 'Max'} ({unit})
          </Label>
          <Input
            id={`${id}-${which}`}
            type="number"
            inputMode="decimal"
            min={0}
            step={scale === 1 ? 1 : 0.1}
            placeholder="Any"
            className="h-8"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            value={field.value === null ? '' : field.value / scale}
            onChange={(e) => {
              const raw = e.target.value;
              field.onChange(raw === '' ? null : Math.max(0, Math.round(Number(raw) * scale)));
            }}
          />
        </div>
      )}
    />
  );
  return (
    <>
      <div className="flex gap-2">
        {bound('min')}
        {bound('max')}
      </div>
      <FieldError id={errorId} message={error} />
    </>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

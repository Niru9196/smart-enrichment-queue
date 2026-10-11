import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, useWatch } from 'react-hook-form';
import { criteriaSchema, criteriaShape } from '@/lib/criteria-schema';
import type { Criteria } from '@/lib/api-schemas';
import { IcpSettings } from './icp-settings';

const saved: Criteria = {
  industry: { weight: 8, strict: false, values: ['Software'] },
  location: { weight: 5, strict: true, values: ['United States'] },
  size: { weight: 6, strict: false, min: 10, max: 250 },
  revenue: { weight: 7, strict: false, min: 2_000_000, max: 50_000_000 },
  completeness: { weight: 3 },
};

function Harness({ onSave = vi.fn() }: { onSave?: (c: Criteria) => void }) {
  const form = useForm<Criteria>({
    resolver: zodResolver(criteriaSchema),
    mode: 'onChange',
    values: saved,
  });
  const values = useWatch({ control: form.control });
  return (
    <>
      <IcpSettings
        form={form}
        industries={['Software', 'Retail']}
        countries={['United States', 'Canada']}
        isDirty={form.formState.isDirty}
        isValid={form.formState.isValid}
        isSaving={false}
        onSave={() => onSave(form.getValues())}
        onDiscard={() => form.reset(saved)}
      />
      <output data-testid="values">{JSON.stringify(values)}</output>
    </>
  );
}

const values = (): Criteria =>
  criteriaShape.parse(JSON.parse(screen.getByTestId('values').textContent ?? '{}'));

describe('IcpSettings', () => {
  it('starts clean with save and discard disabled', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /save profile/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /discard/i })).toBeDisabled();
  });

  it('changes a weight with the keyboard and enables saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);

    const slider = screen.getByRole('slider', { name: 'Industry weight' });
    slider.focus();
    await user.keyboard('{End}');
    expect(values().industry.weight).toBe(10);

    const save = screen.getByRole('button', { name: /save profile/i });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ industry: expect.objectContaining({ weight: 10 }) }),
    );
  });

  it('toggles target chips and discards back to the saved profile', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const retail = screen.getByRole('button', { name: 'Retail' });
    expect(retail).toHaveAttribute('aria-pressed', 'false');
    await user.click(retail);
    expect(retail).toHaveAttribute('aria-pressed', 'true');
    expect(values().industry.values).toEqual(['Software', 'Retail']);

    await user.click(screen.getByRole('button', { name: /discard/i }));
    expect(values().industry.values).toEqual(['Software']);
  });

  it('enters revenue in millions but stores USD, and flags inverted ranges', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const maxRevenue = screen.getByLabelText('Max (USD millions)');
    expect(maxRevenue).toHaveValue(50);

    await user.clear(maxRevenue);
    await user.type(maxRevenue, '1.5');
    expect(values().revenue.max).toBe(1_500_000);
    expect(await screen.findByText('Min must be less than or equal to max')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeDisabled();
  });
});

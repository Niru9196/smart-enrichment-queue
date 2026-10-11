import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('configure ICP, preview, inspect, queue, update status, enrich, and export', async ({
  page,
}) => {
  await page.goto('/?view=leads');
  const rows = page.getByTestId('lead-row');
  await expect(rows.first()).toBeVisible();
  await expect(rows.first()).toContainText('High fit');

  // The default profile has a strict location rule, so some leads are disqualified.
  const disqualified = page.getByTestId('stat-disqualified');
  await expect(disqualified).not.toContainText(/\b0\b/);

  // Editing the profile switches to preview mode; discarding returns to the saved ranking.
  await page.getByRole('slider', { name: 'Industry weight' }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByText('Previewing unsaved profile changes.')).toBeVisible();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByText('Previewing unsaved profile changes.')).toBeHidden();

  // Relaxing the strict location rule previews zero disqualified leads, then persists on save.
  const strictLocation = page
    .getByRole('group', { name: 'Target countries' })
    .locator('xpath=..')
    .getByRole('switch');
  await strictLocation.click();
  await expect(disqualified).toContainText('0');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText(/Profile saved/)).toBeVisible();

  await page.reload();
  await expect(rows.first()).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Target countries' }).locator('xpath=..').getByRole('switch'),
  ).not.toBeChecked();

  // Inspect the top lead and queue it from the detail panel.
  const topName = (await rows.first().getByRole('button').first().innerText()).trim();
  await rows.first().click();
  await expect(page.getByTestId('detail-score')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How the score was built' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to enrichment queue' }).click();
  await expect(page.getByText('1 added to the enrichment queue')).toBeVisible();
  await page.keyboard.press('Escape');

  // Update its status (skip, then re-queue), then run simulated enrichment.
  await page.getByRole('tab', { name: /Enrichment queue/ }).click();
  const queueRow = page.getByTestId('queue-row').filter({ hasText: topName });
  await expect(queueRow).toContainText('Queued');
  await queueRow.getByRole('button', { name: 'Skip' }).click();
  await expect(queueRow).toContainText('Skipped');
  await expect(page.getByRole('button', { name: /Enrich 0 queued/ })).toBeDisabled();

  await queueRow.getByRole('button', { name: 'Re-queue' }).click();
  await expect(queueRow).toContainText('Queued');

  await page.getByRole('button', { name: /Enrich 1 queued/ }).click();
  await expect(queueRow).toContainText('Enriched');

  // Export the queue as CSV.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^enrichment-queue-.*\.csv$/);

  const csv = await readFile(await download.path(), 'utf8');
  expect(csv.split('\r\n')[0]).toContain('queue_status');
  expect(csv).toContain(topName);
  expect(csv).toContain('enriched');
});

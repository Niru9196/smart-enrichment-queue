import { expect, test } from '@playwright/test';

test('landing explains the product and opens the workspace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
    'href',
    '#main',
  );
  const nav = page.getByRole('navigation', { name: 'Landing' });
  await expect(nav.getByRole('link', { name: 'The problem' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'How it works' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Stop guessing which leads deserve your credits.' }),
  ).toBeVisible();
  await expect(page.getByText(/Knowing which ones are worth your time/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'When every scraped company looks like an opportunity' }),
  ).toBeVisible();
  await expect(page.getByText(/high-potential opportunities go unnoticed/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How you use it' })).toBeVisible();
  await page.getByRole('link', { name: 'Open the workspace' }).first().click();
  await expect(page).toHaveURL(/view=leads/);
  await expect(page.getByTestId('lead-row').first()).toBeVisible();
});

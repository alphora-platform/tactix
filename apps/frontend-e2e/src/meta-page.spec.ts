import { test, expect } from '@playwright/test';

test.describe('Meta Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/meta');
  });

  test('page loads with header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Meta Overview' })).toBeVisible();
  });

  test('tier list or comp data section is visible', async ({ page }) => {
    const hasTierList = await page
      .getByText('Tier List')
      .isVisible()
      .catch(() => false);
    const hasTopComps = await page
      .getByText('Top Comps')
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/no data|no comps|loading/i)
      .isVisible()
      .catch(() => false);

    expect(hasTierList || hasTopComps || hasEmptyState).toBeTruthy();
  });
});

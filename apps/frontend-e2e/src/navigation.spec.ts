import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page redirects to /meta', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/meta/);
  });

  test('can navigate to /meta via sidebar', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    const sidebar = page.locator('aside');
    await sidebar.getByRole('link', { name: 'Meta' }).click();

    await expect(page).toHaveURL(/\/meta/);
  });

  test('can navigate to /settings via sidebar', async ({ page }) => {
    await page.goto('/meta');

    const sidebar = page.locator('aside');
    await sidebar.getByRole('link', { name: 'Settings' }).click();

    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('can navigate to /jobs via sidebar', async ({ page }) => {
    await page.goto('/meta');

    const sidebar = page.locator('aside');
    await sidebar.getByRole('link', { name: 'Jobs' }).click();

    await expect(page).toHaveURL(/\/jobs/);
  });
});

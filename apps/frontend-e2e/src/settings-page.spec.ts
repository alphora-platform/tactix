import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Configure the data crawler behaviour.')).toBeVisible();
  });

  test('master toggle (enable/disable) renders', async ({ page }) => {
    await expect(page.getByText('Enable Crawling')).toBeVisible();
    // The toggle pill is a sibling — verify by checking the collecting/paused status text
    const statusText = page.getByText(/Collecting match data|Paused/);
    await expect(statusText).toBeVisible();
  });

  test('crawl mode selector (Official/PBE) works', async ({ page }) => {
    const modeSection = page.getByText('Crawl Mode').locator('../..');
    const officialButton = modeSection.getByRole('button', { name: /Official/i });
    const pbeButton = modeSection.getByRole('button', { name: /PBE/i });

    await expect(officialButton).toBeVisible();
    await expect(pbeButton).toBeVisible();

    // Click PBE and verify it becomes active
    await pbeButton.click();
    await expect(pbeButton).toContainText('Active');
    await expect(page.getByText(/PBE data is pre-release/i)).toBeVisible();

    // Switch back to Official
    await officialButton.click();
    await expect(officialButton).toContainText('Active');
  });

  test('region chips render and are clickable', async ({ page }) => {
    // Use heading-level text that's unique to the regions card
    const regionsCard = page.getByText('Active Regions').first().locator('../..');

    const krChip = regionsCard.getByRole('button', { name: 'KR' });
    const naChip = regionsCard.getByRole('button', { name: 'NA' });
    const euwChip = regionsCard.getByRole('button', { name: 'EUW' });

    await expect(krChip).toBeVisible();
    await expect(naChip).toBeVisible();
    await expect(euwChip).toBeVisible();

    // Click a region chip to toggle it
    await naChip.click();
    await expect(naChip).toBeVisible();
  });

  test('"Refresh Player List" button shows success toast', async ({ page }) => {
    const section = page.getByText('Refresh Player List').locator('../..');
    const refreshButton = section.getByRole('button', { name: /Refresh/i });
    await expect(refreshButton).toBeVisible();

    await refreshButton.click();
    await expect(page.locator('.ant-message')).toContainText(/Queued.*refresh-player-list/i, {
      timeout: 10_000,
    });
  });

  test('"Crawl Now" button shows success toast and navigates to /jobs', async ({ page }) => {
    const crawlNowButton = page.getByRole('button', { name: /Crawl Now/i });
    await expect(crawlNowButton).toBeVisible();

    await crawlNowButton.click();

    await expect(page.locator('.ant-message')).toContainText(/Queued.*collect-region/i, {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/jobs/, { timeout: 10_000 });
  });

  test('"Refresh Materialized Views" button shows success toast', async ({ page }) => {
    const section = page.getByText('Refresh Materialized Views').locator('../..');
    const refreshButton = section.getByRole('button', { name: /Refresh/i });
    await expect(refreshButton).toBeVisible();

    await refreshButton.click();

    await expect(page.locator('.ant-message')).toContainText(/materialized view refresh/i, {
      timeout: 10_000,
    });
  });
});

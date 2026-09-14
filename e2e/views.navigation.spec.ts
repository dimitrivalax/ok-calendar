import { test, expect } from '@playwright/test';

test.describe('views.navigation', () => {
  test('switches between calendar views', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('view-switcher')).toBeVisible({
      timeout: 60_000,
    });

    await page.getByTestId('view-month').click();
    await expect(page.getByTestId('view-month')).toBeVisible();

    await page.getByTestId('view-year').click();
    await expect(page.getByTestId('view-year')).toBeVisible();

    await page.getByTestId('view-day').click();
    await expect(page.getByTestId('view-day')).toBeVisible();

    await page.getByTestId('view-agenda').click();
    await expect(page.getByTestId('view-agenda')).toBeVisible();

    await page.getByTestId('btn-today').click();
  });
});

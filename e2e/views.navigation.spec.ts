import { test, expect } from '@playwright/test';

test.describe('views.navigation', () => {
  test('switches between calendar views', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('view-switcher')).toBeVisible({
      timeout: 60_000,
    });

    await page.getByTestId('view-month').click();
    await expect(page.getByTestId('panel-month')).toBeVisible();

    await page.getByTestId('view-week').click();
    await expect(page.getByTestId('panel-week')).toBeVisible();

    await page.getByTestId('view-day').click();
    await expect(page.getByTestId('panel-day')).toBeVisible();

    await page.getByTestId('view-agenda').click();
    await expect(page.getByTestId('panel-agenda')).toBeVisible();

    await page.getByTestId('btn-today').click();
  });
});

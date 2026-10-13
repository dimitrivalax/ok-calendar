import { expect, test, type Page } from '@playwright/test';

/** Monday — stable week/month/day/agenda title fixtures (en locale). */
const TARGET = '2026-06-15';

async function waitForCalendar(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('view-switcher')).toBeVisible({
    timeout: 60_000,
  });
}

async function ensureEnglish(page: Page) {
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('settings-locale')).toBeVisible();
  await page.getByTestId('locale-en').click();
  await page.goBack();
  await expect(page.getByTestId('view-switcher')).toBeVisible();
}

/**
 * Set the hidden web date input. RN-web may ignore plain `fill` on controlled
 * inputs, so we also dispatch native input/change events.
 */
async function jumpToDate(page: Page, isoDate: string) {
  const input = page.getByTestId('calendar-title-date-input');
  await expect(input).toBeAttached();
  await input.evaluate((el, value) => {
    const node = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, isoDate);
}

test.describe('calendar.jump-to-date', () => {
  test.beforeEach(async ({ page }) => {
    await waitForCalendar(page);
    await ensureEnglish(page);
  });

  test('title control is exposed as Jump to date', async ({ page }) => {
    await expect(
      page.getByTestId('calendar-title').getByText(/.+/),
    ).toBeVisible();
    await expect(page.getByTestId('calendar-title')).toHaveAttribute(
      'aria-label',
      'Jump to date',
    );
  });

  test('day view jumps to the selected date', async ({ page }) => {
    await page.getByTestId('view-day').click();
    await expect(page.getByTestId('panel-day')).toBeVisible();

    await jumpToDate(page, TARGET);

    await expect(page.getByTestId('calendar-title')).toContainText(
      'Monday 15 June 2026',
    );
  });

  test('week view jumps to the week containing the date', async ({ page }) => {
    await page.getByTestId('view-week').click();
    await expect(page.getByTestId('panel-week')).toBeVisible();

    await jumpToDate(page, TARGET);

    await expect(page.getByTestId('calendar-title')).toContainText(
      '15 Jun – 21 Jun 2026',
    );
    await expect(page.getByTestId(`week-day-${TARGET}`)).toBeVisible();
  });

  test('month view jumps to the month containing the date', async ({
    page,
  }) => {
    await page.getByTestId('view-month').click();
    await expect(page.getByTestId('panel-month')).toBeVisible();

    await jumpToDate(page, TARGET);

    await expect(page.getByTestId('calendar-title')).toContainText('June 2026');
    await expect(page.getByTestId(`day-cell-${TARGET}`)).toBeVisible();
  });

  test('agenda view jumps to a 60-day range from the date', async ({
    page,
  }) => {
    await page.getByTestId('view-agenda').click();
    await expect(page.getByTestId('panel-agenda')).toBeVisible();

    await jumpToDate(page, TARGET);

    // 2026-06-15 + 60 days = 2026-08-14
    await expect(page.getByTestId('calendar-title')).toContainText(
      '15 Jun – 14 Aug 2026',
    );
  });

  test('keeps the current view mode after jumping', async ({ page }) => {
    await page.getByTestId('view-month').click();
    await expect(page.getByTestId('panel-month')).toBeVisible();

    await jumpToDate(page, TARGET);

    await expect(page.getByTestId('panel-month')).toBeVisible();
    await expect(page.getByTestId('panel-day')).toHaveCount(0);
  });
});

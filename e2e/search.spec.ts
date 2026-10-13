import { expect, test, type Page } from '@playwright/test';

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
 * Fill a controlled RN-web text input (plain `fill` is not always enough).
 */
async function fillTestInput(page: Page, testId: string, value: string) {
  const input = page.getByTestId(testId);
  await expect(input).toBeVisible();
  await input.click();
  await input.evaluate((el, next) => {
    const node = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(node, next);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function openSearch(page: Page) {
  await page.getByTestId('btn-search').click();
  await expect(page.getByTestId('search-input')).toBeVisible();
}

async function createEvent(page: Page, title: string): Promise<string> {
  await page.getByTestId('fab-new-event').click();
  await expect(page.getByTestId('event-form')).toBeVisible();
  await fillTestInput(page, 'event-title-input', title);
  await page.getByTestId('btn-save-event').click();
  await expect(page.getByTestId('event-detail')).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByTestId('event-detail').getByText(title, { exact: true }),
  ).toBeVisible();

  const match = page.url().match(/\/event\/([^/?#]+)/);
  expect(match?.[1]).toBeTruthy();
  return match![1];
}

test.describe('search', () => {
  test.beforeEach(async ({ page }) => {
    await waitForCalendar(page);
    await ensureEnglish(page);
  });

  test('opens from the header with a focused search field', async ({
    page,
  }) => {
    await openSearch(page);
    await expect(page.getByTestId('search-input')).toBeFocused();
    await expect(page.getByTestId('panel-search')).toHaveCount(0);
  });

  test('finds a created event by title', async ({ page }) => {
    const title = `Search Hit ${Date.now()}`;
    const eventId = await createEvent(page, title);

    await page.goto('/');
    await expect(page.getByTestId('view-switcher')).toBeVisible();
    await openSearch(page);

    await fillTestInput(page, 'search-input', title);
    await expect(page.getByTestId('panel-search')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId(`agenda-event-${eventId}`)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId(`agenda-event-${eventId}`)).toContainText(
      title,
    );
  });

  test('shows empty state when nothing matches', async ({ page }) => {
    await openSearch(page);
    await fillTestInput(page, 'search-input', `NoMatch-${Date.now()}`);
    await expect(page.getByTestId('panel-search')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('occurrence-list-empty')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('occurrence-list-empty')).toHaveText(
      'No matching events',
    );
  });

  test('opens event detail from a search result', async ({ page }) => {
    const title = `Search Open ${Date.now()}`;
    const eventId = await createEvent(page, title);

    await page.goto('/');
    await expect(page.getByTestId('view-switcher')).toBeVisible();
    await openSearch(page);

    await fillTestInput(page, 'search-input', title);
    const result = page.getByTestId(`agenda-event-${eventId}`);
    await expect(result).toBeVisible({ timeout: 10_000 });
    await result.click();

    await expect(page.getByTestId('event-detail')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/event/${eventId}`));
    await expect(
      page.getByTestId('event-detail').getByText(title, { exact: true }),
    ).toBeVisible();
  });
});

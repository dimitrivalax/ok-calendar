import { expect, test } from './axe-test';
import { violationFingerprints } from './a11y-utils';

test.describe('a11y.event-form', () => {
  test('new event form WCAG A/AA scan matches known baseline', async ({
    page,
    makeAxeBuilder,
  }, testInfo) => {
    await page.goto('/');
    await expect(page.getByTestId('view-switcher')).toBeVisible({
      timeout: 60_000,
    });

    await page.getByTestId('fab-new-event').click();
    await expect(page.getByTestId('event-form')).toBeVisible();

    const accessibilityScanResults = await makeAxeBuilder().analyze();

    await testInfo.attach('accessibility-scan-results', {
      body: JSON.stringify(accessibilityScanResults, null, 2),
      contentType: 'application/json',
    });

    expect(violationFingerprints(accessibilityScanResults)).toMatchSnapshot();
  });
});

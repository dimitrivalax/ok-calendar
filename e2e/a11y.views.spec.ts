import { expect, test } from './axe-test';
import { violationFingerprints } from './a11y-utils';

const VIEWS = [
  { tab: 'view-month', panel: 'panel-month' },
  { tab: 'view-week', panel: 'panel-week' },
  { tab: 'view-day', panel: 'panel-day' },
  { tab: 'view-agenda', panel: 'panel-agenda' },
] as const;

test.describe('a11y.views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('view-switcher')).toBeVisible({
      timeout: 60_000,
    });
  });

  for (const { tab, panel } of VIEWS) {
    test(`${panel} WCAG A/AA scan matches known baseline`, async ({
      page,
      makeAxeBuilder,
    }, testInfo) => {
      await page.getByTestId(tab).click();
      await expect(page.getByTestId(panel)).toBeVisible();

      const accessibilityScanResults = await makeAxeBuilder().analyze();

      await testInfo.attach('accessibility-scan-results', {
        body: JSON.stringify(accessibilityScanResults, null, 2),
        contentType: 'application/json',
      });

      // Baseline fingerprint: drive toward `[]` as issues are fixed.
      expect(violationFingerprints(accessibilityScanResults)).toMatchSnapshot();
    });
  }
});

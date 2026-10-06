import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type AxeFixture = {
  makeAxeBuilder: () => AxeBuilder;
};

/**
 * Shared AxeBuilder: WCAG 2.0/2.1 A + AA only (same scope as Accessibility Insights Automated Checks).
 * @see https://playwright.dev/docs/accessibility-testing
 */
export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
      ]);

    await use(makeAxeBuilder);
  },
});

export { expect } from '@playwright/test';

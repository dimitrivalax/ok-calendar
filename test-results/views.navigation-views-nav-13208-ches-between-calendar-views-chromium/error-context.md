# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: views.navigation.spec.ts >> views.navigation >> switches between calendar views
- Location: e2e/views.navigation.spec.ts:4:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('view-month')
    - locator resolved to <div role="tab" tabindex="0" data-testid="view-month" class="css-view-g5y9jx r-cursor-1loqt21 r-touchAction-1otgn73 flex-1 items-center justify-center py-3">…</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div id="error-toast"></div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div id="error-toast"></div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    48 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div id="error-toast"></div> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e13]:
    - generic [ref=e14]:
      - generic [ref=e15]:
        - button "Jump to date" [ref=e16] [cursor=pointer]:
          - generic [ref=e17]: Tuesday 17 November 2026
        - textbox "Jump to date" [ref=e18]: 2026-11-17
        - button "Today" [ref=e19] [cursor=pointer]
      - button "Search" [ref=e21] [cursor=pointer]
      - button "Settings" [ref=e22] [cursor=pointer]
    - generic "Day" [ref=e26]:
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]: 00:00
          - generic [ref=e32]: 01:00
          - generic [ref=e34]: 02:00
          - generic [ref=e36]: 03:00
          - generic [ref=e38]: 04:00
          - generic [ref=e40]: 05:00
          - generic [ref=e42]: 06:00
          - generic [ref=e44]: 07:00
          - generic [ref=e46]: 08:00
          - generic [ref=e48]: 09:00
          - generic [ref=e50]: 10:00
          - generic [ref=e52]: 11:00
          - generic [ref=e54]: 12:00
          - generic [ref=e56]: 13:00
          - generic [ref=e58]: 14:00
          - generic [ref=e60]: 15:00
          - generic [ref=e62]: 16:00
          - generic [ref=e64]: 17:00
          - generic [ref=e66]: 18:00
          - generic [ref=e68]: 19:00
          - generic [ref=e70]: 20:00
          - generic [ref=e72]: 21:00
          - generic [ref=e74]: 22:00
          - generic [ref=e76]: 23:00
        - generic [ref=e78]: No events
    - generic [ref=e79]:
      - tablist [ref=e80]:
        - tab "Month" [ref=e81] [cursor=pointer]
        - tab "Week" [ref=e83] [cursor=pointer]
        - tab "Day" [ref=e85] [cursor=pointer]
        - tab "Agenda" [ref=e87] [cursor=pointer]
      - button "New event" [ref=e89] [cursor=pointer]
  - button "! Encountered a script tag while rendering" [ref=e92] [cursor=pointer]:
    - generic [ref=e93]: "!"
    - generic [ref=e95]: Encountered a script tag while rendering
    - button [ref=e96]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('views.navigation', () => {
  4  |   test('switches between calendar views', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await expect(page.getByTestId('view-switcher')).toBeVisible({
  7  |       timeout: 60_000,
  8  |     });
  9  | 
> 10 |     await page.getByTestId('view-month').click();
     |                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11 |     await expect(page.getByTestId('panel-month')).toBeVisible();
  12 | 
  13 |     await page.getByTestId('view-week').click();
  14 |     await expect(page.getByTestId('panel-week')).toBeVisible();
  15 | 
  16 |     await page.getByTestId('view-day').click();
  17 |     await expect(page.getByTestId('panel-day')).toBeVisible();
  18 | 
  19 |     await page.getByTestId('view-agenda').click();
  20 |     await expect(page.getByTestId('panel-agenda')).toBeVisible();
  21 | 
  22 |     await page.getByTestId('btn-today').click();
  23 |   });
  24 | });
  25 | 
```
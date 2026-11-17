# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar.jump-to-date.spec.ts >> calendar.jump-to-date >> keeps the current view mode after jumping
- Location: e2e/calendar.jump-to-date.spec.ts:105:7

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
    57 × waiting for element to be visible, enabled and stable
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
  6   | async function waitForCalendar(page: Page) {
  7   |   await page.goto('/');
  8   |   await expect(page.getByTestId('view-switcher')).toBeVisible({
  9   |     timeout: 60_000,
  10  |   });
  11  | }
  12  | 
  13  | async function ensureEnglish(page: Page) {
  14  |   await page.getByTestId('btn-settings').click();
  15  |   await expect(page.getByTestId('settings-locale')).toBeVisible();
  16  |   await page.getByTestId('locale-en').click();
  17  |   await page.goBack();
  18  |   await expect(page.getByTestId('view-switcher')).toBeVisible();
  19  | }
  20  | 
  21  | /**
  22  |  * Set the hidden web date input. RN-web may ignore plain `fill` on controlled
  23  |  * inputs, so we also dispatch native input/change events.
  24  |  */
  25  | async function jumpToDate(page: Page, isoDate: string) {
  26  |   const input = page.getByTestId('calendar-title-date-input');
  27  |   await expect(input).toBeAttached();
  28  |   await input.evaluate((el, value) => {
  29  |     const node = el as HTMLInputElement;
  30  |     const setter = Object.getOwnPropertyDescriptor(
  31  |       window.HTMLInputElement.prototype,
  32  |       'value',
  33  |     )?.set;
  34  |     setter?.call(node, value);
  35  |     node.dispatchEvent(new Event('input', { bubbles: true }));
  36  |     node.dispatchEvent(new Event('change', { bubbles: true }));
  37  |   }, isoDate);
  38  | }
  39  | 
  40  | test.describe('calendar.jump-to-date', () => {
  41  |   test.beforeEach(async ({ page }) => {
  42  |     await waitForCalendar(page);
  43  |     await ensureEnglish(page);
  44  |   });
  45  | 
  46  |   test('title control is exposed as Jump to date', async ({ page }) => {
  47  |     await expect(
  48  |       page.getByTestId('calendar-title').getByText(/.+/),
  49  |     ).toBeVisible();
  50  |     await expect(page.getByTestId('calendar-title')).toHaveAttribute(
  51  |       'aria-label',
  52  |       'Jump to date',
  53  |     );
  54  |   });
  55  | 
  56  |   test('day view jumps to the selected date', async ({ page }) => {
  57  |     await page.getByTestId('view-day').click();
  58  |     await expect(page.getByTestId('panel-day')).toBeVisible();
  59  | 
  60  |     await jumpToDate(page, TARGET);
  61  | 
  62  |     await expect(page.getByTestId('calendar-title')).toContainText(
  63  |       'Monday 15 June 2026',
  64  |     );
  65  |   });
  66  | 
  67  |   test('week view jumps to the week containing the date', async ({ page }) => {
  68  |     await page.getByTestId('view-week').click();
  69  |     await expect(page.getByTestId('panel-week')).toBeVisible();
  70  | 
  71  |     await jumpToDate(page, TARGET);
  72  | 
  73  |     await expect(page.getByTestId('calendar-title')).toContainText(
  74  |       '15 Jun – 21 Jun 2026',
  75  |     );
  76  |     await expect(page.getByTestId(`week-day-${TARGET}`)).toBeVisible();
  77  |   });
  78  | 
  79  |   test('month view jumps to the month containing the date', async ({
  80  |     page,
  81  |   }) => {
  82  |     await page.getByTestId('view-month').click();
  83  |     await expect(page.getByTestId('panel-month')).toBeVisible();
  84  | 
  85  |     await jumpToDate(page, TARGET);
  86  | 
  87  |     await expect(page.getByTestId('calendar-title')).toContainText('June 2026');
  88  |     await expect(page.getByTestId(`day-cell-${TARGET}`)).toBeVisible();
  89  |   });
  90  | 
  91  |   test('agenda view jumps to a 60-day range from the date', async ({
  92  |     page,
  93  |   }) => {
  94  |     await page.getByTestId('view-agenda').click();
  95  |     await expect(page.getByTestId('panel-agenda')).toBeVisible();
  96  | 
  97  |     await jumpToDate(page, TARGET);
  98  | 
  99  |     // 2026-06-15 + 60 days = 2026-08-14
  100 |     await expect(page.getByTestId('calendar-title')).toContainText(
  101 |       '15 Jun – 14 Aug 2026',
  102 |     );
  103 |   });
  104 | 
  105 |   test('keeps the current view mode after jumping', async ({ page }) => {
> 106 |     await page.getByTestId('view-month').click();
      |                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  107 |     await expect(page.getByTestId('panel-month')).toBeVisible();
  108 | 
  109 |     await jumpToDate(page, TARGET);
  110 | 
  111 |     await expect(page.getByTestId('panel-month')).toBeVisible();
  112 |     await expect(page.getByTestId('panel-day')).toHaveCount(0);
  113 |   });
  114 | });
  115 | 
```
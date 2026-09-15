/**
 * Map RN `testID` to the DOM attribute Playwright / Testing Library expect.
 * Gluestack web primitives render raw HTML elements, which reject `testID`.
 */
export function withWebTestId<T extends Record<string, unknown>>(props: T) {
  const { testID, ...rest } = props as T & { testID?: string };
  if (testID == null) {
    return rest;
  }
  return { ...rest, 'data-testid': testID };
}

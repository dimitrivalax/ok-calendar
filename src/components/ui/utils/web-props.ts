import { useCallback, useRef, type ForwardedRef } from 'react';

export type WebLayoutChangeEvent = {
  nativeEvent: {
    layout: { x: number; y: number; width: number; height: number };
  };
};

export type WebOnLayout = (event: WebLayoutChangeEvent) => void;

/**
 * Map RN `testID` to the DOM attribute Playwright / Testing Library expect.
 * Strip RN-only `onLayout` so it is never forwarded to a raw HTML element
 * (handle it with `useWebOnLayout` instead).
 */
export function withWebTestId<T extends Record<string, unknown>>(props: T) {
  const { testID, onLayout: _onLayout, ...rest } = props as T & {
    testID?: string;
    onLayout?: unknown;
  };
  if (testID == null) {
    return rest;
  }
  return { ...rest, 'data-testid': testID };
}

/**
 * RN-compatible `onLayout` for gluestack web primitives that render raw HTML.
 */
export function useWebOnLayout<T extends HTMLElement>(
  onLayout: WebOnLayout | undefined,
  forwardedRef: ForwardedRef<T>,
) {
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;
  const observerRef = useRef<ResizeObserver | null>(null);

  return useCallback(
    (node: T | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef != null) {
        forwardedRef.current = node;
      }

      if (!node || !onLayoutRef.current) {
        return;
      }

      const report = () => {
        const { x, y, width, height } = node.getBoundingClientRect();
        onLayoutRef.current?.({
          nativeEvent: { layout: { x, y, width, height } },
        });
      };

      report();

      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      const observer = new ResizeObserver(report);
      observer.observe(node);
      observerRef.current = observer;
    },
    [forwardedRef],
  );
}

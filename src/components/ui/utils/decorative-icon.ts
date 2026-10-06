import { Platform } from 'react-native';

/**
 * Props for decorative Lucide / SVG icons nested inside labeled controls.
 * Prevents axe `svg-img-alt` on icons that already have an accessible name on the parent.
 * Keep web props DOM-safe — RN a11y attributes must not be forwarded to HTML.
 */
export const decorativeIconProps =
  Platform.OS === 'web'
    ? ({
        'aria-hidden': true,
        focusable: false,
        role: 'presentation',
      } as const)
    : ({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      });

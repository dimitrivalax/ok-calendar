import React from 'react';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { hstackStyle } from './styles';
import {
  useWebOnLayout,
  withWebTestId,
  type WebOnLayout,
} from '../utils/web-props';

type IHStackProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof hstackStyle> & {
    testID?: string;
    onLayout?: WebOnLayout;
  };

const HStack = React.forwardRef<React.ComponentRef<'div'>, IHStackProps>(
  function HStack({ className, space, reversed, onLayout, ...props }, ref) {
    const setRef = useWebOnLayout(onLayout, ref);
    return (
      <div
        className={hstackStyle({
          space,
          reversed: reversed as boolean,
          class: className,
        })}
        {...withWebTestId(props)}
        ref={setRef}
      />
    );
  }
);

HStack.displayName = 'HStack';

export { HStack };

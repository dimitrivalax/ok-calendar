import React from 'react';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

import { vstackStyle } from './styles';
import {
  useWebOnLayout,
  withWebTestId,
  type WebOnLayout,
} from '../utils/web-props';

type IVStackProps = React.ComponentProps<'div'> &
  VariantProps<typeof vstackStyle> & {
    testID?: string;
    onLayout?: WebOnLayout;
  };

const VStack = React.forwardRef<React.ComponentRef<'div'>, IVStackProps>(
  function VStack({ className, space, reversed, onLayout, ...props }, ref) {
    const setRef = useWebOnLayout(onLayout, ref);
    return (
      <div
        className={vstackStyle({
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

VStack.displayName = 'VStack';

export { VStack };

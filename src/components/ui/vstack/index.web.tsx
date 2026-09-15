import React from 'react';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

import { vstackStyle } from './styles';
import { withWebTestId } from '../utils/web-props';

type IVStackProps = React.ComponentProps<'div'> &
  VariantProps<typeof vstackStyle> & { testID?: string };

const VStack = React.forwardRef<React.ComponentRef<'div'>, IVStackProps>(
  function VStack({ className, space, reversed, ...props }, ref) {
    return (
      <div
        className={vstackStyle({
          space,
          reversed: reversed as boolean,
          class: className,
        })}
        {...withWebTestId(props)}
        ref={ref}
      />
    );
  }
);

VStack.displayName = 'VStack';

export { VStack };

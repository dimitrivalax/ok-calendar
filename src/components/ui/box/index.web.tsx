import React from 'react';
import { boxStyle } from './styles';

import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import {
  useWebOnLayout,
  withWebTestId,
  type WebOnLayout,
} from '../utils/web-props';

type IBoxProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof boxStyle> & {
    className?: string;
    testID?: string;
    onLayout?: WebOnLayout;
  };

const Box = React.forwardRef<HTMLDivElement, IBoxProps>(function Box(
  { className, onLayout, ...props },
  ref
) {
  const setRef = useWebOnLayout(onLayout, ref);
  return (
    <div
      ref={setRef}
      className={boxStyle({ class: className })}
      {...withWebTestId(props)}
    />
  );
});

Box.displayName = 'Box';
export { Box };

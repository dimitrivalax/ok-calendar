import React, { useEffect } from 'react';
import { Appearance, View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';

export type ModeType = 'light' | 'dark' | 'system';

function toNativeScheme(
  mode: ModeType,
): Parameters<typeof Appearance.setColorScheme>[0] {
  // 'unspecified' follows the system preference
  if (mode === 'system') return 'unspecified';
  return mode;
}

export function GluestackUIProvider({
  mode = 'system',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  useEffect(() => {
    Appearance.setColorScheme(toNativeScheme(mode));
  }, [mode]);

  return (
    <View
      className="flex-1 bg-background"
      style={[
        { flex: 1, height: '100%', width: '100%' },
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}

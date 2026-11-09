import React, { forwardRef } from 'react';
import { View as NativeView, ViewProps } from 'react-native';

export const SafeView = forwardRef<any, ViewProps>(function SafeView(props, ref) {
  const children = React.Children.map(props.children, (child) => {
    if (typeof child === 'string' && child.trim().length === 0) return null;
    return child;
  });

  return <NativeView {...props} ref={ref}>{children}</NativeView>;
});

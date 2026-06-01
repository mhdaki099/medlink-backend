import React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAwareWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  enableScroll?: boolean;
  extraScrollHeight?: number;
  keyboardVerticalOffset?: number;
}

export default function KeyboardAwareWrapper({
  children,
  style,
  contentContainerStyle,
  enableScroll = true,
  extraScrollHeight = 20,
  keyboardVerticalOffset = 0,
}: KeyboardAwareWrapperProps) {
  const insets = useSafeAreaInsets();

  const behavior = Platform.OS === 'ios' ? 'padding' : undefined;

  if (enableScroll) {
    return (
      <KeyboardAvoidingView
        style={[{ flex: 1 }, style]}
        behavior={behavior}
        keyboardVerticalOffset={insets.top + keyboardVerticalOffset}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            {
              flexGrow: 1,
              paddingBottom: insets.bottom + extraScrollHeight,
            },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={behavior}
      keyboardVerticalOffset={insets.top + keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

// Hook for consistent safe area padding
export function useSafePadding() {
  const insets = useSafeAreaInsets();
  
  return {
    bottom: insets.bottom,
    top: insets.top,
    left: insets.left,
    right: insets.right,
    // Common padding values
    screenHorizontal: 16,
    sectionGap: 24,
    elementGap: 12,
  };
}

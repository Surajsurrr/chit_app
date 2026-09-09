import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noShadow?: boolean;
  border?: boolean;
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  noShadow = false,
  border = false,
  padding = SPACING.md,
}) => {
  return (
    <View
      style={[
        styles.card,
        { padding },
        border && styles.border,
        !noShadow && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shadow: Platform.select({
    web: {
      boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
    },
    default: {
      ...SHADOWS.md,
    },
  }) as any,
});
export default Card;

import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
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
  shadow: {
    ...SHADOWS.md,
  },
});
export default Card;

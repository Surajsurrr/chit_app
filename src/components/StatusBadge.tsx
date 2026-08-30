import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface StatusBadgeProps {
  status: 'DUE' | 'PAID' | 'OVERDUE';
  style?: StyleProp<ViewStyle>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'PAID':
        return styles.paid;
      case 'OVERDUE':
        return styles.overdue;
      case 'DUE':
      default:
        return styles.due;
    }
  };

  const getTextStyle = () => {
    switch (status) {
      case 'PAID':
        return styles.paidText;
      case 'OVERDUE':
        return styles.overdueText;
      case 'DUE':
      default:
        return styles.dueText;
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      <Text style={[styles.text, getTextStyle()]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paid: {
    backgroundColor: COLORS.successLight,
  },
  paidText: {
    color: COLORS.success,
  },
  overdue: {
    backgroundColor: COLORS.dangerLight,
  },
  overdueText: {
    color: COLORS.danger,
  },
  due: {
    backgroundColor: COLORS.warningLight,
  },
  dueText: {
    color: COLORS.warning,
  },
  text: {
    ...TYPOGRAPHY.captionBold,
    letterSpacing: 0.5,
    fontSize: 10,
  },
});

export default StatusBadge;

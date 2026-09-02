import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface StatusBadgeProps {
  status: 'DUE' | 'PAID' | 'OVERDUE' | 'DUE TODAY' | 'UPCOMING' | string;
  style?: StyleProp<ViewStyle>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const normalized = status.toUpperCase();

  const getBadgeStyle = () => {
    switch (normalized) {
      case 'PAID':
        return styles.paid;
      case 'OVERDUE':
        return styles.overdue;
      case 'DUE TODAY':
      case 'DUE':
        return styles.due;
      case 'UPCOMING':
      default:
        return styles.upcoming;
    }
  };

  const getTextStyle = () => {
    switch (normalized) {
      case 'PAID':
        return styles.paidText;
      case 'OVERDUE':
        return styles.overdueText;
      case 'DUE TODAY':
      case 'DUE':
        return styles.dueText;
      case 'UPCOMING':
      default:
        return styles.upcomingText;
    }
  };

  const getPrefix = () => {
    if (normalized === 'OVERDUE') return '⚠️ ';
    if (normalized === 'PAID') return '✓ ';
    return '';
  };

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      <Text style={[styles.text, getTextStyle()]}>
        {getPrefix()}{normalized}
      </Text>
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
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  paidText: {
    color: '#15803D',
  },
  overdue: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  overdueText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  due: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  dueText: {
    color: '#B45309',
  },
  upcoming: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  upcomingText: {
    color: '#475569',
  },
  text: {
    ...TYPOGRAPHY.captionBold,
    letterSpacing: 0.5,
    fontSize: 10,
  },
});

export default StatusBadge;

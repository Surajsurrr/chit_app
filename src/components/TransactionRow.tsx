import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { formatDateShort } from '../utils/dateHelpers';

interface TransactionRowProps {
  amount: number;
  date: string;
  method: string;
  onPressReceipt: () => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  amount,
  date,
  method,
  onPressReceipt,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <Text style={styles.methodText}>{method}</Text>
        <Text style={styles.dateText}>{formatDateShort(date)}</Text>
      </View>
      <View style={styles.rightContainer}>
        <Text style={styles.amountText}>+₹{amount.toLocaleString('en-IN')}</Text>
        <TouchableOpacity
          style={styles.receiptButton}
          onPress={onPressReceipt}
          activeOpacity={0.7}
        >
          <Text style={styles.receiptText}>Receipt</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leftContainer: {
    flex: 1,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  methodText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  amountText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.success,
  },
  receiptButton: {
    marginTop: 4,
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: 6,
  },
  receiptText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 10,
  },
});

export default TransactionRow;

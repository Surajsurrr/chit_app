import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { formatDateLong } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const ReceiptDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { receiptId } = route.params;
  const { receipts } = useChitData();
  
  const receipt = receipts.find((r) => r.id === receiptId);

  if (!receipt) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Receipt not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.receiptCard}>
          {/* Ticket Header cut-out indicator */}
          <View style={styles.successBanner}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner} />
            </View>
            <Text style={styles.successTitle}>Payment Successful</Text>
            <Text style={styles.heroAmount}>₹{receipt.amount.toLocaleString('en-IN')}</Text>
          </View>

          {/* Receipt details */}
          <View style={styles.detailsContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Receipt Number</Text>
              <Text style={styles.value}>{receipt.receiptNumber}</Text>
            </View>
            
            <View style={styles.row}>
              <Text style={styles.label}>Reference ID</Text>
              <Text style={[styles.value, styles.refId]}>{receipt.referenceId}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Customer Name</Text>
              <Text style={styles.value}>{receipt.customerName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Date & Time</Text>
              <Text style={styles.value}>{formatDateLong(receipt.date)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Scheme Name</Text>
              <Text style={styles.value}>{receipt.schemeName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.value}>{receipt.method}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.balanceLabel}>Remaining Balance</Text>
              <Text style={styles.balanceValue}>₹{receipt.remainingBalance.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {/* Ticket jagged edge simulator */}
          <View style={styles.jaggedContainer}>
            {Array.from({ length: 15 }).map((_, i) => (
              <View key={i} style={styles.jaggedTooth} />
            ))}
          </View>
        </Card>

        <Button
          title="Done"
          onPress={() => navigation.goBack()}
          style={styles.doneBtn}
        />
        
        <Text style={styles.shareText}>Receipt sharing and PDF export can be integrated here</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  receiptCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 0,
    elevation: 4,
  },
  successBanner: {
    backgroundColor: COLORS.successLight,
    padding: SPACING.xl,
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  successIconOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successIconInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
  },
  successTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    ...TYPOGRAPHY.amountLarge,
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  detailsContainer: {
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  value: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  refId: {
    fontFamily: 'System', // use monospace-ish default
  },
  balanceLabel: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  balanceValue: {
    ...TYPOGRAPHY.amountMedium,
    color: COLORS.danger,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginVertical: SPACING.md,
  },
  jaggedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    height: 10,
    marginTop: -5,
  },
  jaggedTooth: {
    width: 14,
    height: 14,
    backgroundColor: COLORS.background,
    transform: [{ rotate: '45deg' }],
    marginTop: 4,
  },
  doneBtn: {
    width: '100%',
    marginTop: SPACING.lg,
  },
  shareText: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: SPACING.md,
    color: COLORS.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.danger,
    marginBottom: SPACING.lg,
  },
});

export default ReceiptDetailScreen;

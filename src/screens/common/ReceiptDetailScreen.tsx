import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { formatDateLong } from '../../utils/dateHelpers';
import { downloadReceiptPdf } from '../../utils/receiptGenerator';
import { StatusBar } from 'expo-status-bar';

export const ReceiptDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { receiptId } = route.params;
  const { receipts, customers, schemes } = useChitData();
  const [isDownloading, setIsDownloading] = useState(false);

  const receipt = receipts.find((r) => r.id === receiptId);

  if (!receipt) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Receipt not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const customer = customers.find((c) => c.id === receipt.customerId);
  const scheme = schemes.find(
    (s) => s.id === customer?.schemeId || s.name === receipt.schemeName
  );

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await downloadReceiptPdf(receipt, customer, scheme);
      if (res.success) {
        // Success feedback handled in downloadReceiptPdf
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not download receipt');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.receiptCard}>
          {/* Ticket Header cut-out indicator */}
          <View style={styles.successBanner}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner} />
            </View>
            <Text style={styles.successTitle}>Payment Verified</Text>
            <Text style={styles.heroAmount}>₹{receipt.amount.toLocaleString('en-IN')}</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.receiptNumBadge}>{receipt.receiptNumber}</Text>
            </View>
          </View>

          {/* Receipt details */}
          <View style={styles.detailsContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Receipt Number</Text>
              <Text style={[styles.value, styles.monoValue]}>{receipt.receiptNumber}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Reference ID</Text>
              <Text style={[styles.value, styles.monoValue]}>{receipt.referenceId}</Text>
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
              <Text style={styles.balanceValue}>
                ₹{receipt.remainingBalance.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Ticket jagged edge simulator */}
          <View style={styles.jaggedContainer}>
            {Array.from({ length: 15 }).map((_, i) => (
              <View key={i} style={styles.jaggedTooth} />
            ))}
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsBox}>
          <TouchableOpacity
            style={[styles.downloadBtn, isDownloading && styles.downloadBtnDisabled]}
            onPress={handleDownload}
            disabled={isDownloading}
            activeOpacity={0.8}
          >
            {isDownloading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.downloadBtnText}>📥 Download PDF Receipt</Text>
            )}
          </TouchableOpacity>

          <Button
            title="Done / Close"
            onPress={() => navigation.goBack()}
            style={styles.doneBtn}
            variant="outline"
          />
        </View>

        <Text style={styles.shareText}>
          Official digital receipt issued by ChitFlow Enterprises.
          {'\n'}PDF download is compatible with mobile, tablet & desktop.
        </Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    marginBottom: SPACING.sm,
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
    marginTop: SPACING.xs,
  },
  badgeRow: {
    marginTop: SPACING.xs,
  },
  receiptNumBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#065F46',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    overflow: 'hidden',
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
  monoValue: {
    fontFamily: 'monospace',
    color: COLORS.secondary,
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
  actionsBox: {
    width: '100%',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  downloadBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  downloadBtnDisabled: {
    opacity: 0.7,
  },
  downloadBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 15,
  },
  doneBtn: {
    width: '100%',
  },
  shareText: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: SPACING.md,
    color: COLORS.textLight,
    lineHeight: 16,
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

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { formatDateLong } from '../../utils/dateHelpers';
import { downloadReceiptPdf, formatPaymentProofMessage } from '../../utils/receiptGenerator';
import { StatusBar } from 'expo-status-bar';

export const ReceiptDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { receiptId, autoDownload, isNewPayment } = route.params;
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
      await downloadReceiptPdf(receipt, customer, scheme);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not download invoice');
    } finally {
      setIsDownloading(false);
    }
  };

  // Automatically trigger download/save prompt if opened right after recording payment
  useEffect(() => {
    if (autoDownload) {
      const timer = setTimeout(() => {
        handleDownload();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoDownload]);

  const handleSendProof = () => {
    if (!customer) {
      Alert.alert('Customer Not Found', 'No phone details available for this receipt.');
      return;
    }

    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const proofText = formatPaymentProofMessage(receipt, customer, scheme);

    Alert.alert(
      'Send Payment Proof to Customer',
      `Deliver verified invoice proof to ${customer.name} (+91 ${customer.phone})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '💬 WhatsApp',
          onPress: async () => {
            const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(proofText)}`;
            try {
              await Linking.openURL(url);
            } catch {
              Alert.alert('Error', 'Could not open WhatsApp.');
            }
          },
        },
        {
          text: '📱 SMS',
          onPress: async () => {
            const url =
              Platform.OS === 'ios'
                ? `sms:${cleanPhone}&body=${encodeURIComponent(proofText)}`
                : `sms:${cleanPhone}?body=${encodeURIComponent(proofText)}`;
            try {
              await Linking.openURL(url);
            } catch {
              Alert.alert('Error', 'Could not open SMS application.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* If this was just recorded by admin, show prompt banner */}
        {isNewPayment && (
          <View style={styles.newPaymentBanner}>
            <Text style={styles.newPaymentIcon}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.newPaymentTitle}>Payment Recorded & Credited!</Text>
              <Text style={styles.newPaymentDesc}>
                Customer balance updated. Official invoice proof is generated below.
              </Text>
            </View>
          </View>
        )}

        {/* Digital Ticket / Invoice Card */}
        <Card style={styles.receiptCard}>
          {/* Header Banner */}
          <View style={styles.successBanner}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner} />
            </View>
            <Text style={styles.invoiceTitle}>TAX INVOICE & PAYMENT PROOF</Text>
            <Text style={styles.heroAmount}>₹{receipt.amount.toLocaleString('en-IN')}</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.receiptNumBadge}>{receipt.receiptNumber}</Text>
            </View>
          </View>

          {/* Invoice details table */}
          <View style={styles.detailsContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Invoice / Receipt No</Text>
              <Text style={[styles.value, styles.monoValue]}>{receipt.receiptNumber}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Transaction Reference</Text>
              <Text style={[styles.value, styles.monoValue]}>{receipt.referenceId}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Customer / Member</Text>
              <Text style={styles.value}>{receipt.customerName}</Text>
            </View>

            {customer?.phone ? (
              <View style={styles.row}>
                <Text style={styles.label}>Contact Phone</Text>
                <Text style={styles.value}>+91 {customer.phone}</Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <Text style={styles.label}>Payment Date & Time</Text>
              <Text style={styles.value}>{formatDateLong(receipt.date)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Chit Scheme</Text>
              <Text style={styles.value}>{receipt.schemeName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.value}>{receipt.method}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Payment Verification</Text>
              <Text style={[styles.value, { color: COLORS.success }]}>✓ Verified & Settled</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.balanceLabel}>Remaining Chit Balance</Text>
              <Text style={styles.balanceValue}>
                ₹{receipt.remainingBalance.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Ticket jagged edge */}
          <View style={styles.jaggedContainer}>
            {Array.from({ length: 15 }).map((_, i) => (
              <View key={i} style={styles.jaggedTooth} />
            ))}
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsBox}>
          {/* Download PDF Invoice Button */}
          <TouchableOpacity
            style={[styles.downloadBtn, isDownloading && styles.downloadBtnDisabled]}
            onPress={handleDownload}
            disabled={isDownloading}
            activeOpacity={0.85}
          >
            {isDownloading ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color={COLORS.white} size="small" />
                <Text style={styles.downloadBtnText}>Generating Invoice PDF...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.btnIcon}>📥</Text>
                <Text style={styles.downloadBtnText}>Download Invoice (PDF)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Send Proof to Customer Button */}
          <TouchableOpacity
            style={styles.shareProofBtn}
            onPress={handleSendProof}
            activeOpacity={0.85}
          >
            <Text style={styles.btnIcon}>💬</Text>
            <Text style={styles.shareProofBtnText}>Send Proof to Customer (WhatsApp / SMS)</Text>
          </TouchableOpacity>

          {/* Done / Close Button */}
          <Button
            title="Done / Back to Dashboard"
            onPress={() => navigation.goBack()}
            style={styles.doneBtn}
            variant="outline"
          />
        </View>

        <Text style={styles.shareText}>
          Official computerized payment invoice proof issued via ChitFlow Enterprises.
          {'\n'}All records are permanently stored in the customer portal.
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
  newPaymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  newPaymentIcon: {
    fontSize: 26,
    marginRight: SPACING.sm,
  },
  newPaymentTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#065F46',
  },
  newPaymentDesc: {
    ...TYPOGRAPHY.caption,
    color: '#047857',
    marginTop: 2,
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
  invoiceTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
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
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  downloadBtnDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  downloadBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 15,
  },
  shareProofBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingVertical: SPACING.md - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareProofBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#1D4ED8',
    fontSize: 13,
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

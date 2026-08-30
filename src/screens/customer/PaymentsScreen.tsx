import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import TransactionRow from '../../components/TransactionRow';
import { formatDateLong } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const PaymentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    payments,
    getCustomerStats,
    recordPayment,
  } = useChitData();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  // Modal state
  const [isPayModalVisible, setIsPayModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank Transfer'>('UPI');
  const [payError, setPayError] = useState('');

  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Customer account not selected.</Text>
      </SafeAreaView>
    );
  }

  const stats = getCustomerStats(customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);

  const handleOpenPay = () => {
    setPayAmount(customer.collectionAmount.toString());
    setPayMethod('UPI');
    setPayError('');
    setIsPayModalVisible(true);
  };

  const handleMakePayment = () => {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Please enter a valid amount');
      return;
    }

    const result = recordPayment(customer.id, amount, payMethod);

    if (result.success && result.receipt) {
      setIsPayModalVisible(false);
      navigation.navigate('ReceiptDetail', { receiptId: result.receipt.id });
    } else {
      setPayError(result.error || 'Payment failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Payments</Text>
        <Text style={styles.headerSubtitle}>History and upcoming installments</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Due Card */}
        {stats.remainingAmount > 0 ? (
          <Card style={styles.dueCard}>
            <View style={styles.dueRow}>
              <View style={styles.dueInfo}>
                <Text style={styles.dueLabel}>UPCOMING PAYMENT DUE</Text>
                <Text style={styles.dueDate}>{formatDateLong(customer.nextPaymentDate)}</Text>
                <Text style={styles.dueAmount}>
                  ₹{customer.collectionAmount.toLocaleString('en-IN')} · Every {customer.frequency.replace(/every_/g, '').replace(/_/g, ' ')}
                </Text>
              </View>
              <TouchableOpacity style={styles.payNowBtn} onPress={handleOpenPay} activeOpacity={0.8}>
                <Text style={styles.payNowBtnText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <Card style={[styles.dueCard, styles.settledCard]}>
            <Text style={styles.settledTitle}>✓ Account Fully Settled</Text>
            <Text style={styles.settledDesc}>All recurring dues for this chit scheme are completed.</Text>
          </Card>
        )}

        {/* History title */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <Card style={styles.historyCard}>
          {customerPayments.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyText}>No payments recorded yet.</Text>
            </View>
          ) : (
            customerPayments.map((item) => (
              <TransactionRow
                key={item.id}
                amount={item.amount}
                date={item.date}
                method={item.method}
                onPressReceipt={() => navigation.navigate('ReceiptDetail', { receiptId: item.receiptId })}
              />
            ))
          )}
        </Card>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPayModalVisible}
        onRequestClose={() => setIsPayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Make Payment</Text>
              <TouchableOpacity onPress={() => setIsPayModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalCustName}>{customer.name}</Text>
              
              <View style={styles.modalStatsCard}>
                <Text style={styles.statsLabel}>REMAINING BALANCE</Text>
                <Text style={styles.statsValue}>₹{stats.remainingAmount.toLocaleString('en-IN')}</Text>
              </View>

              {payError ? <Text style={styles.modalError}>{payError}</Text> : null}

              <FormInput
                label="Payment Amount (₹)"
                value={payAmount}
                onChangeText={(val) => {
                  setPayAmount(val);
                  setPayError('');
                }}
                keyboardType="numeric"
              />

              <Text style={styles.modalLabel}>Select Payment Method</Text>
              <View style={styles.methodGrid}>
                {(['UPI', 'Cash', 'Card', 'Bank Transfer'] as const).map((method) => {
                  const isSelected = payMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodBtn,
                        isSelected ? styles.methodBtnSelected : null,
                      ]}
                      onPress={() => setPayMethod(method)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.methodBtnText,
                          isSelected ? styles.methodBtnTextSelected : null,
                        ]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                title="Pay Now"
                onPress={handleMakePayment}
                style={styles.modalSubmitBtn}
                size="large"
                variant="success"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  scrollContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  dueCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueInfo: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  dueLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 9,
  },
  dueDate: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  dueAmount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  payNowBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  payNowBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
  },
  settledCard: {
    backgroundColor: COLORS.successLight,
    borderColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    paddingVertical: SPACING.md + 4,
  },
  settledTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.success,
  },
  settledDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    marginTop: 4,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 0,
    marginBottom: SPACING.xl,
  },
  emptyHistory: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  errorText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.danger,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  closeBtnText: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: SPACING.lg,
  },
  modalCustName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  modalStatsCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statsLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
  },
  statsValue: {
    ...TYPOGRAPHY.amountMedium,
    color: COLORS.danger,
    marginTop: 4,
  },
  modalError: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  modalLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryLight,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.xl,
  },
  methodBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: SPACING.sm + 2,
    margin: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    width: '46%',
    flexGrow: 1,
  },
  methodBtnSelected: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  methodBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
  },
  methodBtnTextSelected: {
    color: COLORS.white,
  },
  modalSubmitBtn: {
    marginBottom: SPACING.xl,
  },
});

export default PaymentsScreen;

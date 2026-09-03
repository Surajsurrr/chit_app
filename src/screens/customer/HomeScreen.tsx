import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import TransactionRow from '../../components/TransactionRow';
import { formatDateLong, formatDateShort, getPaymentStatusInfo, formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';
import { Scheme } from '../../data/mockData';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    payments,
    schemes,
    getCustomerStats,
    recordPayment,
    updateCustomerScheme,
    logout,
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
        <Button title="Log Out" onPress={() => logout()} />
      </SafeAreaView>
    );
  }

  const scheme = schemes.find((s) => s.id === customer.schemeId);
  const stats = getCustomerStats(customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);
  const recentPayments = customerPayments.slice(0, 3); // top 3
  const statusInfo = getPaymentStatusInfo(customer.nextPaymentDate, stats.remainingAmount, customer.frequency);
  const isOverdue = statusInfo.isOverdue;

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
      // Open receipt details screen
      navigation.navigate('ReceiptDetail', { receiptId: result.receipt.id });
    } else {
      setPayError(result.error || 'Payment failed to record');
    }
  };

  const handleSelectScheme = (selectedScheme: Scheme) => {
    if (selectedScheme.id === customer.schemeId) return;

    const interest = selectedScheme.interestAmount || 0;
    const payout = selectedScheme.payoutAmount || (selectedScheme.totalAmount - interest);

    Alert.alert(
      'Enroll in Scheme',
      `Would you like to choose "${selectedScheme.name}" as your active scheme?\n\n• Total Scheme Value: ₹${selectedScheme.totalAmount.toLocaleString('en-IN')}\n• Upfront Net Payout: ₹${payout.toLocaleString('en-IN')}\n• Repayment: ₹${selectedScheme.collectionAmount.toLocaleString('en-IN')} (${formatFrequency(selectedScheme.frequency)})\n• Duration: ${selectedScheme.durationWeeksOrMonths} installments`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Enroll',
          onPress: async () => {
            const res = await updateCustomerScheme(customer.id, selectedScheme.id);
            if (res.success) {
              Alert.alert(
                'Scheme Updated! 🎉',
                `You have successfully enrolled in "${selectedScheme.name}". Your dashboard has been updated with the new scheme parameters.`
              );
            } else {
              Alert.alert('Error', res.error || 'Failed to update scheme');
            }
          },
        },
      ]
    );
  };

  const nameInitials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>WELCOME BACK</Text>
          <Text style={styles.customerName}>{customer.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.avatarText}>{nameInitials}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Remaining Balance Hero */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>REMAINING BALANCE</Text>
          <Text style={styles.heroAmount}>₹{stats.remainingAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.heroSubText}>
            of ₹{customer.amountGiven.toLocaleString('en-IN')} total scheme amount
          </Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFg, { width: `${stats.progressPercentage}%` }]} />
          </View>

          <View style={styles.summaryStatsRow}>
            <View>
              <Text style={styles.subStatLabel}>PAID SO FAR</Text>
              <Text style={styles.subStatValue}>₹{stats.paidAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.subStatLabel}>PAYMENTS</Text>
              <Text style={styles.subStatValue}>{stats.totalPayments} payments</Text>
            </View>
          </View>
        </Card>

        {/* Next Payment Card */}
        {stats.remainingAmount > 0 ? (
          <Card style={styles.nextPayCard}>
            {isOverdue && (
              <View style={styles.overdueHeaderBadge}>
                <Text style={styles.overdueHeaderBadgeText}>⚠️ PAYMENT OVERDUE</Text>
              </View>
            )}
            <Text style={[styles.nextPayLabel, isOverdue && styles.overdueNextPayLabel]}>
              {isOverdue ? 'MISSED INSTALLMENT DUE' : 'NEXT PAYMENT DUE'}
            </Text>
            <Text style={[styles.nextPayDate, isOverdue && styles.overdueNextPayDate]}>
              {formatDateLong(customer.nextPaymentDate)}
            </Text>
            <Text style={[styles.nextPayDetails, isOverdue && styles.overdueNextPayDetails]}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)} {isOverdue ? `(${statusInfo.statusText})` : ''}
            </Text>
            <Button
              title={isOverdue ? `Pay Overdue Dues (₹${customer.collectionAmount.toLocaleString('en-IN')}) ⚠️` : 'Make Payment'}
              onPress={handleOpenPay}
              style={[styles.payBtn, isOverdue && styles.overduePayBtn]}
              size="large"
            />
          </Card>
        ) : (
          <Card style={[styles.nextPayCard, styles.settledCard]}>
            <Text style={styles.settledTextTitle}>✓ Account Fully Settled</Text>
            <Text style={styles.settledTextDesc}>
              You have completed all installments for this scheme. Congratulations!
            </Text>
          </Card>
        )}

        {/* My Active Chit Scheme Section */}
        <Text style={styles.sectionTitle}>My Chit Scheme & Payout Details</Text>
        <Card style={styles.schemeCard}>
          <View style={styles.schemeRow}>
            <Text style={styles.schemeLabel}>Scheme Name</Text>
            <Text style={styles.schemeVal}>{scheme ? scheme.name : 'Active Scheme'}</Text>
          </View>
          <View style={styles.schemeRow}>
            <Text style={styles.schemeLabel}>Total Scheme Value</Text>
            <Text style={styles.schemeVal}>₹{customer.amountGiven.toLocaleString('en-IN')}</Text>
          </View>
          {scheme && (scheme.interestAmount !== undefined) ? (
            <View style={styles.schemeRow}>
              <Text style={styles.schemeLabel}>Upfront Interest Deduction</Text>
              <Text style={styles.schemeInterestVal}>
                - ₹{scheme.interestAmount.toLocaleString('en-IN')} ({((scheme.interestAmount / customer.amountGiven) * 100).toFixed(1)}% rate)
              </Text>
            </View>
          ) : null}
          <View style={[styles.schemeRow, styles.schemeHighlightRow]}>
            <Text style={styles.schemeHighlightLabel}>Net Amount Received (Payout)</Text>
            <Text style={styles.schemeHighlightVal}>
              ₹{(scheme?.payoutAmount ?? (customer.amountGiven - (scheme?.interestAmount ?? 0))).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.schemeRow}>
            <Text style={styles.schemeLabel}>Installment Schedule</Text>
            <Text style={styles.schemeVal}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)}
            </Text>
          </View>

          {/* Customer Explanation Note */}
          <View style={styles.customerNoticeBox}>
            <Text style={styles.noticeIcon}>ℹ️</Text>
            <Text style={styles.noticeText}>
              {scheme?.description ||
                `You receive a net payout of ₹${(scheme?.payoutAmount ?? (customer.amountGiven - (scheme?.interestAmount ?? 0))).toLocaleString('en-IN')} upfront (after ₹${(scheme?.interestAmount ?? 0).toLocaleString('en-IN')} interest deduction), and repay ₹${customer.amountGiven.toLocaleString('en-IN')} across scheduled installments.`}
            </Text>
          </View>
        </Card>

        {/* Available Admin Schemes Section */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Available Admin Schemes</Text>
          <Text style={styles.sectionSubtitle}>Choose or switch to any scheme offered by the organizer</Text>
        </View>

        {schemes.map((s) => {
          const isCurrent = s.id === customer.schemeId;
          const interest = s.interestAmount || 0;
          const interestRate = ((interest / s.totalAmount) * 100).toFixed(1);
          const payout = s.payoutAmount || Math.max(0, s.totalAmount - interest);

          return (
            <Card key={s.id} style={[styles.availableSchemeCard, isCurrent && styles.activeSchemeCardBorder]}>
              <View style={styles.schemeCardHeader}>
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
                  <Text style={styles.schemeCardName}>{s.name}</Text>
                  <Text style={styles.schemeCardTag}>
                    ₹{s.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(s.frequency)} ({s.durationWeeksOrMonths} collections)
                  </Text>
                </View>

                {isCurrent ? (
                  <View style={styles.enrolledBadge}>
                    <Text style={styles.enrolledBadgeText}>✓ Active Scheme</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectSchemeBtn}
                    onPress={() => handleSelectScheme(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectSchemeBtnText}>Choose Scheme →</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.schemeCardDivider} />

              <View style={styles.schemeCardGrid}>
                <View style={styles.schemeCardCol}>
                  <Text style={styles.schemeCardLabel}>TOTAL VALUE</Text>
                  <Text style={styles.schemeCardVal}>₹{s.totalAmount.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.schemeCardCol}>
                  <Text style={styles.schemeCardLabel}>INTEREST DEDUCTION</Text>
                  <Text style={styles.schemeCardInterest}>- ₹{interest.toLocaleString('en-IN')} ({interestRate}%)</Text>
                </View>
                <View style={styles.schemeCardCol}>
                  <Text style={styles.schemeCardLabel}>NET PAYOUT</Text>
                  <Text style={styles.schemeCardPayout}>₹{payout.toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {s.description ? (
                <Text style={styles.schemeCardDesc}>{s.description}</Text>
              ) : null}
            </Card>
          );
        })}

        {/* Recent Payment History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Receipts')}>
            <Text style={styles.sectionLink}>View All</Text>
          </TouchableOpacity>
        </View>
        <Card style={styles.historyCard}>
          {recentPayments.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No payments made yet.</Text>
            </View>
          ) : (
            recentPayments.map((item) => (
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

      {/* Make Payment Modal (Bottom Sheet style) */}
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

              <Text style={styles.gatewayDisclaimer}>
                This is a simulated secure transaction for demonstration purposes.
              </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  welcomeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  customerName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  heroCard: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  heroAmount: {
    ...TYPOGRAPHY.amountLarge,
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  heroSubText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: SPACING.md,
  },
  progressBarFg: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subStatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  subStatValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    marginTop: 2,
  },
  nextPayCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  overdueNextPayCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderLeftWidth: 6,
  },
  overdueHeaderBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  overdueHeaderBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  nextPayLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  overdueNextPayLabel: {
    color: '#B91C1C',
  },
  nextPayDate: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  overdueNextPayDate: {
    color: '#991B1B',
  },
  nextPayDetails: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  overdueNextPayDetails: {
    color: '#DC2626',
    fontWeight: '600',
  },
  payBtn: {
    width: '100%',
  },
  overduePayBtn: {
    backgroundColor: '#DC2626',
  },
  settledCard: {
    backgroundColor: COLORS.successLight,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: SPACING.lg,
  },
  settledTextTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.success,
  },
  settledTextDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.success,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  sectionHeaderBox: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: -SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionLink: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.secondary,
  },
  schemeCard: {
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  schemeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  schemeInterestVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#D97706',
  },
  schemeHighlightRow: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    marginVertical: 4,
    borderBottomWidth: 0,
  },
  schemeHighlightLabel: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#047857',
    fontSize: 13,
  },
  schemeHighlightVal: {
    ...TYPOGRAPHY.amountMedium,
    color: '#059669',
    fontSize: 15,
  },
  customerNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: SPACING.sm + 2,
    marginTop: SPACING.md,
    alignItems: 'flex-start',
  },
  noticeIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 1,
  },
  noticeText: {
    ...TYPOGRAPHY.caption,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
    fontSize: 11,
  },
  schemeLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  schemeVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  // Available Admin Schemes Styles
  availableSchemeCard: {
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  activeSchemeCardBorder: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  schemeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schemeCardName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
  },
  schemeCardTag: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  enrolledBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 16,
  },
  enrolledBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#065F46',
    fontSize: 11,
  },
  selectSchemeBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectSchemeBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  schemeCardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm + 2,
  },
  schemeCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  schemeCardCol: {
    flex: 1,
  },
  schemeCardLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
  },
  schemeCardVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginTop: 2,
  },
  schemeCardInterest: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#D97706',
    marginTop: 2,
  },
  schemeCardPayout: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.success,
    marginTop: 2,
  },
  schemeCardDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontSize: 11,
    lineHeight: 15,
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
  emptyHistoryText: {
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
    marginBottom: SPACING.lg,
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
    marginBottom: SPACING.md,
  },
  gatewayDisclaimer: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    color: COLORS.textLight,
    marginBottom: SPACING.xl,
  },
});

export default HomeScreen;

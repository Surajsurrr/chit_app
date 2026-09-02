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
import { formatDateLong, formatDateShort } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    payments,
    schemes,
    getCustomerStats,
    recordPayment,
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
            <Text style={styles.nextPayLabel}>NEXT PAYMENT DUE</Text>
            <Text style={styles.nextPayDate}>{formatDateLong(customer.nextPaymentDate)}</Text>
            <Text style={styles.nextPayDetails}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')} · Every {customer.frequency.replace(/every_/g, '').replace(/_/g, ' ')}
            </Text>
            <Button
              title="Make Payment"
              onPress={handleOpenPay}
              style={styles.payBtn}
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

        {/* My Chit Scheme Section */}
        <Text style={styles.sectionTitle}>My Chit Scheme</Text>
        <Card style={styles.schemeCard}>
          <View style={styles.schemeRow}>
            <Text style={styles.schemeLabel}>Scheme Name</Text>
            <Text style={styles.schemeVal}>{scheme ? scheme.name : 'Active Scheme'}</Text>
          </View>
          <View style={styles.schemeRow}>
            <Text style={styles.schemeLabel}>Scheme Amount</Text>
            <Text style={styles.schemeVal}>₹{customer.amountGiven.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.schemeRow}>
            <Text style={styles.schemeLabel}>Collection terms</Text>
            <Text style={styles.schemeVal}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')} · Every {customer.frequency.replace(/every_/g, '').replace(/_/g, ' ')}
            </Text>
          </View>
        </Card>

        {/* Recent Payment History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payments')}>
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
  nextPayLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  nextPayDate: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  nextPayDetails: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  payBtn: {
    width: '100%',
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
  schemeLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  schemeVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
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

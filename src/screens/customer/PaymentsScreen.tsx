import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import TransactionRow from '../../components/TransactionRow';
import { formatDateLong, getPaymentStatusInfo, formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const PaymentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    payments,
    getCustomerStats,
  } = useChitData();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top', 'bottom']}>
        <Text style={styles.errorText}>Customer account not selected.</Text>
      </SafeAreaView>
    );
  }

  const stats = getCustomerStats(customer.id);
  const totalVal = customer.totalAmount || customer.amountGiven || 0;
  const customerPayments = payments.filter((p) => p.customerId === customer.id);
  const statusInfo = getPaymentStatusInfo(customer.nextPaymentDate, stats.remainingAmount, customer.frequency);
  const isOverdue = statusInfo.isOverdue && stats.remainingAmount > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Payments</Text>
        <Text style={styles.headerSubtitle}>History and upcoming installments</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Due Card */}
        {totalVal === 0 ? (
          <Card style={styles.dueCard}>
            <View style={styles.noSchemeDueBox}>
              <Text style={styles.noSchemeDueIcon}>ℹ️</Text>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={styles.noSchemeDueTitle}>Awaiting Lending Terms</Text>
                <Text style={styles.noSchemeDueText}>
                  Your account has been created. The organizer will set up your loan disbursement amount and installment plan.
                </Text>
              </View>
            </View>
          </Card>
        ) : stats.remainingAmount > 0 ? (
          <Card style={[styles.dueCard, isOverdue && styles.overdueDueCard]}>
            {isOverdue && (
              <View style={styles.overdueHeaderBadge}>
                <Text style={styles.overdueHeaderBadgeText}>⚠️ PAYMENT OVERDUE</Text>
              </View>
            )}
            <View style={styles.dueRow}>
              <View style={styles.dueInfo}>
                <Text style={[styles.dueLabel, isOverdue && styles.overdueDueLabel]}>
                  {isOverdue ? 'MISSED PAYMENT DUE' : 'UPCOMING PAYMENT DUE'}
                </Text>
                <Text style={[styles.dueDate, isOverdue && styles.overdueDueDate]}>
                  {formatDateLong(customer.nextPaymentDate)}
                </Text>
                <Text style={[styles.dueAmount, isOverdue && styles.overdueDueAmount]}>
                  ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)} {isOverdue ? `(${statusInfo.statusText})` : ''}
                </Text>
                <View style={styles.dueRemainingStatRow}>
                  <Text style={styles.dueRemainingStatLabel}>Remaining Balance: </Text>
                  <Text style={styles.dueRemainingStatVal}>₹{stats.remainingAmount.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.adminCollectionNote}>
                  📌 Installments are collected & verified directly by Administrator
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={[styles.dueCard, styles.settledCard]}>
            <Text style={styles.settledTitle}>✓ Account Fully Settled</Text>
            <Text style={styles.settledDesc}>All recurring dues for your loan are completed.</Text>
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
    paddingTop: SPACING.md,
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
  overdueDueCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderLeftWidth: 6,
  },
  overdueHeaderBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  overdueHeaderBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueInfo: {
    flex: 1,
  },
  dueLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 9,
  },
  overdueDueLabel: {
    color: '#B91C1C',
  },
  dueDate: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  overdueDueDate: {
    color: '#991B1B',
  },
  dueAmount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  overdueDueAmount: {
    color: '#DC2626',
    fontWeight: '600',
  },
  dueRemainingStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dueRemainingStatLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  dueRemainingStatVal: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger,
    fontSize: 12,
  },
  adminCollectionNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
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
  noSchemeDueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  noSchemeDueIcon: {
    fontSize: 24,
  },
  noSchemeDueTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
  },
  noSchemeDueText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});

export default PaymentsScreen;


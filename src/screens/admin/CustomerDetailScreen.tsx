import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import TransactionRow from '../../components/TransactionRow';
import { formatDateLong, formatDateShort } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const CustomerDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { customerId } = route.params;
  const { customers, payments, schemes, getCustomerStats } = useChitData();

  const customer = customers.find((c) => c.id === customerId);
  
  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Customer record not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const scheme = schemes.find((s) => s.id === customer.schemeId);
  const stats = getCustomerStats(customerId);
  const customerPayments = payments.filter((p) => p.customerId === customerId);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{customer.name}</Text>
          <Text style={styles.headerSubtitle}>+91 {customer.phone}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Remaining Balance Hero Card */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>REMAINING BALANCE</Text>
          <Text style={styles.heroAmount}>₹{stats.remainingAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.heroSubText}>
            of ₹{customer.amountGiven.toLocaleString('en-IN')} total scheme value
          </Text>

          <View style={styles.dividerLight} />

          {/* Mini progress stats */}
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.progressLabel}>PAID SO FAR</Text>
              <Text style={styles.progressVal}>₹{stats.paidAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.progressLabel}>PAYMENTS MADE</Text>
              <Text style={styles.progressVal}>{stats.totalPayments} payments</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFg, { width: `${stats.progressPercentage}%` }]} />
          </View>
        </Card>

        {/* Scheme & Payment Terms Card */}
        <Text style={styles.sectionTitle}>Collection Scheme Details</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chit Scheme</Text>
            <Text style={styles.infoValue}>{scheme ? scheme.name : 'Not Assigned'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Installment Amount</Text>
            <Text style={styles.infoValue}>₹{customer.collectionAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Frequency</Text>
            <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
              {customer.frequency.replace(/_/g, ' ')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Date</Text>
            <Text style={styles.infoValue}>{formatDateShort(customer.startDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Next Collection Due</Text>
            <Text style={[styles.infoValue, styles.dueDateVal]}>
              {formatDateLong(customer.nextPaymentDate)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Collections', { customerId: customer.id })}
          >
            <Text style={styles.actionBtnText}>Record Collection / Collect Payment</Text>
          </TouchableOpacity>
        </Card>

        {/* Payment History */}
        <Text style={styles.sectionTitle}>Payment History</Text>
        <Card style={styles.historyCard}>
          {customerPayments.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No payments recorded for this customer yet.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  backButton: {
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.md,
  },
  backButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.white,
    fontWeight: '600',
  },
  headerInfo: {
    marginLeft: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 2,
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
  dividerLight: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: SPACING.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  progressLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  progressVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    marginTop: 2,
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFg: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  infoCard: {
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  dueDateVal: {
    color: COLORS.warning,
  },
  actionBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  actionBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 0, // padding handled inside transaction row
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
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 10,
  },
  backBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
  },
});

export default CustomerDetailScreen;

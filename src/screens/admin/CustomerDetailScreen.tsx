import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import TransactionRow from '../../components/TransactionRow';
import { formatDateLong, formatDateShort, getPaymentStatusInfo, formatFrequency } from '../../utils/dateHelpers';
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
  const statusInfo = getPaymentStatusInfo(customer.nextPaymentDate, stats.remainingAmount, customer.frequency);
  const isOverdue = statusInfo.isOverdue;

  const handleSendMessage = () => {
    const schemeName = scheme ? scheme.name : 'Chit Scheme';
    let defaultMsg = '';
    if (isOverdue) {
      defaultMsg = `Dear ${customer.name}, this is an urgent reminder from ChitFlow. Your chit installment of ₹${customer.collectionAmount.toLocaleString('en-IN')} for "${schemeName}" is OVERDUE (${statusInfo.statusText}). Please settle your payment immediately. Thank you!`;
    } else {
      defaultMsg = `Dear ${customer.name}, this is a reminder from ChitFlow. Your chit installment of ₹${customer.collectionAmount.toLocaleString('en-IN')} for "${schemeName}" is due on ${statusInfo.formattedDueDate}. Thank you!`;
    }

    Alert.alert(
      'Send Payment Reminder',
      `Send automated payment reminder to ${customer.name} (+91 ${customer.phone})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '💬 WhatsApp',
          onPress: async () => {
            const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
            const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(defaultMsg)}`;
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
            const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
            const url = Platform.OS === 'ios'
              ? `sms:${cleanPhone}&body=${encodeURIComponent(defaultMsg)}`
              : `sms:${cleanPhone}?body=${encodeURIComponent(defaultMsg)}`;
            try {
              await Linking.openURL(url);
            } catch {
              Alert.alert('Error', 'Could not open SMS app.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerTitle}>{customer.name}</Text>
            <StatusBadge status={statusInfo.badgeLabel} />
          </View>
          <Text style={styles.headerSubtitle}>+91 {customer.phone}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overdue Alert Banner */}
        {isOverdue && (
          <View style={styles.overdueAlertBanner}>
            <Text style={styles.overdueAlertIcon}>⚠️</Text>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={styles.overdueAlertTitle}>Payment Overdue</Text>
              <Text style={styles.overdueAlertDesc}>
                Installment of ₹{customer.collectionAmount.toLocaleString('en-IN')} was due on {formatDateLong(customer.nextPaymentDate)} ({statusInfo.statusText}).
              </Text>
            </View>
          </View>
        )}

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
              {formatFrequency(customer.frequency)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Date</Text>
            <Text style={styles.infoValue}>{formatDateShort(customer.startDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Next Collection Due</Text>
            <Text style={[styles.infoValue, isOverdue ? styles.overdueDueDateVal : styles.dueDateVal]}>
              {formatDateLong(customer.nextPaymentDate)} {isOverdue ? `(${statusInfo.statusText})` : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, isOverdue && styles.overdueActionBtn]}
            onPress={() => navigation.navigate('Collections', { customerId: customer.id })}
          >
            <Text style={styles.actionBtnText}>
              {isOverdue ? `Record Overdue Collection (₹${customer.collectionAmount.toLocaleString('en-IN')}) ⚠️` : 'Record Collection / Collect Payment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailMessageBtn}
            onPress={handleSendMessage}
            activeOpacity={0.8}
          >
            <Text style={styles.detailMessageBtnText}>💬 Send Payment Reminder Message</Text>
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
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
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
  overdueAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderLeftWidth: 6,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  overdueAlertIcon: {
    fontSize: 24,
  },
  overdueAlertTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#991B1B',
  },
  overdueAlertDesc: {
    ...TYPOGRAPHY.caption,
    color: '#B91C1C',
    marginTop: 2,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 110,
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
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
  },
  progressVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    marginTop: 2,
  },
  progressBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFg: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
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
  overdueInfoCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF8F8',
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
  overdueDueDateVal: {
    color: '#DC2626',
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  overdueActionBtn: {
    backgroundColor: '#DC2626',
  },
  actionBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
  },
  detailMessageBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: SPACING.md - 2,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  detailMessageBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#2563EB',
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

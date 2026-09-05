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

  const hasScheme = Boolean(
    (customer.schemeId && customer.schemeId.trim() !== '') ||
    (customer.enrolledSchemes && customer.enrolledSchemes.length > 0)
  );
  const scheme = hasScheme ? schemes.find((s) => s.id === customer.schemeId) : null;
  const enrolledSnapshot = hasScheme
    ? (customer.enrolledSchemes?.find((es) => es.schemeId === customer.schemeId)
      || customer.enrolledSchemes?.[customer.enrolledSchemes.length - 1])
    : null;
  const schemeName = hasScheme ? (enrolledSnapshot?.schemeName || scheme?.name || 'Chit Scheme') : 'No Scheme Enrolled Yet';
  const schemeValue = enrolledSnapshot?.totalAmount || customer.amountGiven || 0;
  const interestAmount = enrolledSnapshot?.interestAmount ?? scheme?.interestAmount ?? 0;
  const payoutAmount = enrolledSnapshot?.payoutAmount ?? (scheme?.payoutAmount ?? Math.max(0, schemeValue - interestAmount));

  const stats = getCustomerStats(customerId);
  const customerPayments = payments.filter((p) => p.customerId === customerId);
  const statusInfo = getPaymentStatusInfo(customer.nextPaymentDate, stats.remainingAmount, customer.frequency);
  const isOverdue = hasScheme && statusInfo.isOverdue;

  const handleSendMessage = () => {
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
          <Text style={styles.headerSubtitle}>
            +91 {customer.phone} {customer.email ? ` · ✉️ ${customer.email}` : ''}
          </Text>
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
        <Text style={styles.sectionTitle}>Collection Scheme & Payout Details</Text>
        {!hasScheme ? (
          <Card style={styles.infoCard}>
            <View style={{ alignItems: 'center', paddingVertical: SPACING.md }}>
              <Text style={{ fontSize: 28, marginBottom: SPACING.xs }}>🪙</Text>
              <Text style={styles.emptyContractTitle}>No Scheme Enrolled Yet</Text>
              <Text style={styles.emptyContractText}>
                This member registered on the portal but has not availed any chit scheme yet. Once they complete their profile and choose a scheme, the contract terms will appear here.
              </Text>
            </View>
          </Card>
        ) : (
          <Card style={styles.infoCard}>
            <View style={styles.lockedContractBadge}>
              <Text style={styles.lockedContractIcon}>🔒</Text>
              <View style={{ flex: 1, marginLeft: SPACING.xs }}>
                <Text style={styles.lockedContractTitle}>PERMANENT ENROLLED CONTRACT</Text>
                <Text style={styles.lockedContractSub}>
                  Agreed at enrollment ({formatDateShort(enrolledSnapshot?.enrolledAt || customer.startDate)}) · Terms locked forever
                </Text>
              </View>
            </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chit Scheme</Text>
            <Text style={styles.infoValue}>{schemeName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Scheme Value</Text>
            <Text style={styles.infoValue}>₹{schemeValue.toLocaleString('en-IN')}</Text>
          </View>
          {interestAmount > 0 ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Upfront Interest Deducted</Text>
              <Text style={[styles.infoValue, { color: '#D97706' }]}>
                - ₹{interestAmount.toLocaleString('en-IN')} ({((interestAmount / schemeValue) * 100).toFixed(1)}% rate)
              </Text>
            </View>
          ) : null}
          <View style={[styles.infoRow, styles.payoutRow]}>
            <Text style={styles.payoutRowLabel}>Net Disbursed Payout (Received)</Text>
            <Text style={styles.payoutRowValue}>
              ₹{payoutAmount.toLocaleString('en-IN')}
            </Text>
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

          {/* Scheme description / explanation note */}
          <View style={styles.explanationBox}>
            <Text style={styles.explanationIcon}>ℹ️</Text>
            <Text style={styles.explanationText}>
              {scheme?.description ||
                `Customer receives net ₹${payoutAmount.toLocaleString('en-IN')} upfront after ₹${interestAmount.toLocaleString('en-IN')} interest deduction on the ₹${schemeValue.toLocaleString('en-IN')} scheme value.`}
              {'\n'}• Terms are permanent for this customer. Any modifications to scheme templates in Admin affect only future new enrollments.
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
              onPress={() => navigation.navigate('Schemes')}
              activeOpacity={0.8}
            >
              <Text style={styles.allSchemesBtnText}>View All Master Scheme Templates →</Text>
            </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailMessageBtn}
            onPress={handleSendMessage}
            activeOpacity={0.8}
          >
            <Text style={styles.detailMessageBtnText}>💬 Send Payment Reminder Message</Text>
          </TouchableOpacity>
        </Card>
        )}

        {/* Customer Profile & Contact Details Card */}
        <Text style={styles.sectionTitle}>Customer Profile & Contact Info</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Mobile</Text>
            <View style={styles.contactActionRow}>
              <Text style={styles.infoValue}>+91 {customer.phone}</Text>
              <TouchableOpacity
                style={styles.inlineActionBtn}
                onPress={() => Linking.openURL(`tel:${customer.phone}`)}
              >
                <Text style={styles.inlineActionText}>📞 Call</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Address</Text>
            <View style={styles.contactActionRow}>
              <Text style={[styles.infoValue, !customer.email && styles.placeholderValue]}>
                {customer.email || 'Not provided'}
              </Text>
              {customer.email ? (
                <TouchableOpacity
                  style={styles.inlineActionBtn}
                  onPress={() => Linking.openURL(`mailto:${customer.email}`)}
                >
                  <Text style={styles.inlineActionText}>✉️ Mail</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Residential Address</Text>
            <Text
              style={[
                styles.infoValue,
                !customer.address && styles.placeholderValue,
                { maxWidth: '60%', textAlign: 'right' },
              ]}
            >
              {customer.address || 'Not provided'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City & Region</Text>
            <Text style={[styles.infoValue, !customer.city && styles.placeholderValue]}>
              {customer.city || 'Not provided'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pincode</Text>
            <Text style={[styles.infoValue, !customer.pincode && styles.placeholderValue]}>
              {customer.pincode || 'Not provided'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Occupation</Text>
            <Text style={[styles.infoValue, !customer.occupation && styles.placeholderValue]}>
              {customer.occupation || 'Not provided'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Government ID Proof</Text>
            <Text style={[styles.infoValue, !customer.idProofNumber && styles.placeholderValue]}>
              {customer.idProofType || 'Aadhaar'}: {customer.idProofNumber || 'Not submitted'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nominee Name</Text>
            <Text style={[styles.infoValue, !customer.nomineeName && styles.placeholderValue]}>
              {customer.nomineeName || 'Not provided'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nominee Relationship</Text>
            <Text style={[styles.infoValue, !customer.nomineeRelation && styles.placeholderValue]}>
              {customer.nomineeRelation || 'Not provided'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Account ID</Text>
            <Text style={[styles.infoValue, { fontFamily: 'monospace', color: COLORS.secondary }]}>
              {customer.id.toUpperCase()}
            </Text>
          </View>
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
  lockedContractBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm + 2,
  },
  lockedContractIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  lockedContractTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#0F172A',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  lockedContractSub: {
    ...TYPOGRAPHY.caption,
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
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
  payoutRow: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    marginVertical: 4,
    borderBottomWidth: 0,
  },
  payoutRowLabel: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#047857',
    fontSize: 13,
  },
  payoutRowValue: {
    ...TYPOGRAPHY.amountMedium,
    color: '#059669',
    fontSize: 15,
  },
  explanationBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: SPACING.sm + 2,
    marginTop: SPACING.md,
    alignItems: 'flex-start',
  },
  explanationIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 1,
  },
  explanationText: {
    ...TYPOGRAPHY.caption,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
    fontSize: 11,
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
  contactActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  inlineActionBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inlineActionText: {
    ...TYPOGRAPHY.captionBold,
    color: '#2563EB',
    fontSize: 10,
  },
  placeholderValue: {
    color: COLORS.textLight,
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  allSchemesBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
  },
  emptyContractTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  emptyContractText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 380,
  },
});

export default CustomerDetailScreen;

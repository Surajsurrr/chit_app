import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import TransactionRow from '../../components/TransactionRow';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { formatDateLong, formatDateShort, getPaymentStatusInfo, formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const CustomerDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { customerId } = route.params;
  const { customers, payments, getCustomerStats, updateCustomerTerms } = useChitData();

  const customer = customers.find((c) => c.id === customerId);

  // Edit Terms Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editPayout, setEditPayout] = useState('');
  const [editInterest, setEditInterest] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editCollection, setEditCollection] = useState('');
  const [editFrequency, setEditFrequency] = useState<'daily' | 'every_3_days' | 'weekly' | 'monthly'>('daily');
  const [editDuration, setEditDuration] = useState('50');
  const [editNextDueDate, setEditNextDueDate] = useState('');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top', 'bottom']}>
        <Text style={styles.errorText}>Customer record not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalValue = customer.totalAmount || customer.amountGiven || 0;
  const interestAmt = customer.interestAmount ?? Math.max(0, totalValue - (customer.payoutAmount || 0));
  const payoutAmt = customer.payoutAmount ?? Math.max(0, totalValue - interestAmt);
  const interestRate = customer.interestRate ?? (payoutAmt > 0 ? (interestAmt / payoutAmt) * 100 : 0);

  const stats = getCustomerStats(customerId);
  const customerPayments = payments.filter((p) => p.customerId === customerId);
  const statusInfo = getPaymentStatusInfo(customer.nextPaymentDate, stats.remainingAmount, customer.frequency);
  const isOverdue = statusInfo.isOverdue;

  const handleOpenEditModal = () => {
    setEditPayout(payoutAmt.toString());
    setEditInterest(interestAmt.toString());
    setEditTotal(totalValue.toString());
    setEditCollection(customer.collectionAmount.toString());
    setEditFrequency(customer.frequency);
    setEditDuration((customer.durationInstallments || 50).toString());
    setEditNextDueDate(customer.nextPaymentDate ? customer.nextPaymentDate.split('T')[0] : '');
    setEditError('');
    setIsEditModalVisible(true);
  };

  const computeEditCycles = (repayment: number, installment: number): string => {
    if (repayment > 0 && installment > 0) {
      const cycles = Math.ceil(repayment / installment);
      return cycles > 0 ? cycles.toString() : '';
    }
    return '';
  };

  const handleEditPayoutChange = (val: string) => {
    setEditPayout(val);
    const p = parseFloat(val) || 0;
    const i = parseFloat(editInterest) || 0;
    const tot = p + i;
    setEditTotal(tot > 0 ? tot.toString() : '');
    const col = parseFloat(editCollection) || 0;
    if (col > 0 && tot > 0) {
      setEditDuration(computeEditCycles(tot, col));
    }
  };

  const handleEditInterestChange = (val: string) => {
    setEditInterest(val);
    const p = parseFloat(editPayout) || 0;
    const i = parseFloat(val) || 0;
    const tot = p + i;
    setEditTotal(tot > 0 ? tot.toString() : '');
    const col = parseFloat(editCollection) || 0;
    if (col > 0 && tot > 0) {
      setEditDuration(computeEditCycles(tot, col));
    }
  };

  const handleEditTotalChange = (val: string) => {
    setEditTotal(val);
    const tot = parseFloat(val) || 0;
    const p = parseFloat(editPayout) || 0;
    if (tot >= p && p > 0) {
      setEditInterest((tot - p).toString());
    }
    const col = parseFloat(editCollection) || 0;
    if (col > 0 && tot > 0) {
      setEditDuration(computeEditCycles(tot, col));
    }
  };

  const handleEditCollectionChange = (val: string) => {
    setEditCollection(val);
    const col = parseFloat(val) || 0;
    const tot = parseFloat(editTotal) || 0;
    if (col > 0 && tot > 0) {
      setEditDuration(computeEditCycles(tot, col));
    }
  };

  const handleEditDurationChange = (val: string) => {
    setEditDuration(val);
    const dur = parseInt(val, 10) || 0;
    const tot = parseFloat(editTotal) || 0;
    if (dur > 0 && tot > 0) {
      setEditCollection(Math.round(tot / dur).toString());
    }
  };

  const handleSaveTerms = async () => {
    const pAmt = parseFloat(editPayout);
    const iAmt = parseFloat(editInterest) || 0;
    const totAmt = parseFloat(editTotal) || (pAmt + iAmt);
    const colAmt = parseFloat(editCollection);
    const dur = parseInt(editDuration, 10) || 50;

    if (isNaN(pAmt) || pAmt < 0) {
      setEditError('Please enter a valid payout amount');
      return;
    }
    if (isNaN(totAmt) || totAmt <= 0) {
      setEditError('Please enter a valid total repayment amount');
      return;
    }
    if (isNaN(colAmt) || colAmt <= 0) {
      setEditError('Please enter a valid installment collection amount');
      return;
    }

    setIsSaving(true);
    setEditError('');

    const res = await updateCustomerTerms(customer.id, {
      payoutAmount: pAmt,
      interestAmount: iAmt,
      interestRate: pAmt > 0 ? (iAmt / pAmt) * 100 : 0,
      totalAmount: totAmt,
      collectionAmount: colAmt,
      frequency: editFrequency,
      durationInstallments: dur,
      nextPaymentDate: editNextDueDate ? new Date(editNextDueDate).toISOString() : undefined,
    });

    setIsSaving(false);

    if (res.success) {
      setIsEditModalVisible(false);
      Alert.alert('Terms Updated ✓', `Lending and collection terms for ${customer.name} have been updated successfully.`);
    } else {
      setEditError(res.error || 'Failed to update customer terms');
    }
  };

  const handleSendMessage = () => {
    let defaultMsg = '';
    if (isOverdue) {
      defaultMsg = `Dear ${customer.name} (ID: ${customer.id}), this is an urgent reminder from ChitFlow. Your installment of ₹${customer.collectionAmount.toLocaleString('en-IN')} is OVERDUE (${statusInfo.statusText}). Remaining Balance: ₹${stats.remainingAmount.toLocaleString('en-IN')}. Please settle your payment immediately. Thank you!`;
    } else if (statusInfo.status === 'DUE_TODAY') {
      defaultMsg = `Dear ${customer.name} (ID: ${customer.id}), this is a reminder from ChitFlow. Your installment of ₹${customer.collectionAmount.toLocaleString('en-IN')} is due TODAY. Remaining Balance: ₹${stats.remainingAmount.toLocaleString('en-IN')}. Thank you!`;
    } else {
      defaultMsg = `Dear ${customer.name} (ID: ${customer.id}), this is a notification from ChitFlow. Your next installment of ₹${customer.collectionAmount.toLocaleString('en-IN')} is due on ${statusInfo.formattedDueDate}. Remaining Balance: ₹${stats.remainingAmount.toLocaleString('en-IN')}. Thank you!`;
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerTitle}>{customer.name}</Text>
            <View style={styles.custIdBadge}>
              <Text style={styles.custIdBadgeText}>{customer.id}</Text>
            </View>
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
          <Text style={styles.heroLabel}>REMAINING REPAYMENT BALANCE</Text>
          <Text style={styles.heroAmount}>₹{stats.remainingAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.heroSubText}>
            of ₹{totalValue.toLocaleString('en-IN')} total repayment obligation
          </Text>

          <View style={styles.dividerLight} />

          {/* Mini progress stats */}
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.progressLabel}>PAID SO FAR</Text>
              <Text style={styles.progressVal}>₹{stats.paidAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.progressLabel}>COLLECTIONS RECORDED</Text>
              <Text style={styles.progressVal}>{stats.totalPayments} payments</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFg, { width: `${stats.progressPercentage}%` }]} />
          </View>
        </Card>

        {/* Lending Terms & Collection Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Lending & Collection Terms</Text>
          <TouchableOpacity
            style={styles.editTermsBtn}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
          >
            <Text style={styles.editTermsBtnText}>✏️ Edit Terms</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer ID (Login ID)</Text>
            <Text style={[styles.infoValue, { color: COLORS.secondary, fontWeight: '700' }]}>
              {customer.id}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.payoutRow]}>
            <Text style={styles.payoutRowLabel}>Disbursed Principal Payout</Text>
            <Text style={styles.payoutRowValue}>
              ₹{payoutAmt.toLocaleString('en-IN')}
            </Text>
          </View>
          {interestAmt > 0 ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Interest Charged</Text>
              <Text style={[styles.infoValue, { color: '#D97706' }]}>
                ₹{interestAmt.toLocaleString('en-IN')} ({interestRate.toFixed(1)}%)
              </Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Repayment Value</Text>
            <Text style={[styles.infoValue, { fontWeight: '700' }]}>
              ₹{totalValue.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Collection Installment</Text>
            <Text style={styles.infoValue}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Frequency</Text>
            <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
              {formatFrequency(customer.frequency)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Installment Cycles</Text>
            <Text style={styles.infoValue}>
              {customer.durationInstallments || 50} installments
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
              {isOverdue
                ? `Record Overdue Collection (₹${customer.collectionAmount.toLocaleString('en-IN')}) ⚠️`
                : 'Record Collection / Collect Payment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailMessageBtn}
            onPress={handleSendMessage}
            activeOpacity={0.8}
          >
            <Text style={styles.detailMessageBtnText}>💬 Send Payment Reminder (WhatsApp / SMS)</Text>
          </TouchableOpacity>
        </Card>

        {/* Customer Profile & Contact Details Card */}
        <Text style={styles.sectionTitle}>Customer Profile & Contact Info</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer ID</Text>
            <Text style={[styles.infoValue, { fontFamily: 'monospace', color: COLORS.secondary }]}>
              {customer.id}
            </Text>
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
            <Text style={styles.infoLabel}>Nominee Name</Text>
            <Text style={[styles.infoValue, !customer.nomineeName && styles.placeholderValue]}>
              {customer.nomineeName || 'Not provided'}
            </Text>
          </View>
        </Card>

        {/* Payment History Card */}
        <Text style={styles.sectionTitle}>Payment & Collection History</Text>
        <Card style={styles.historyCard}>
          {customerPayments.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No payments recorded yet</Text>
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

      {/* Edit Lending Terms Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Lending & Collection Terms</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {editError ? <Text style={styles.errorTextBanner}>{editError}</Text> : null}

              <View style={styles.modalTwoCol}>
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
                  <FormInput
                    label="Payout Amount (₹)"
                    placeholder="e.g. 50000"
                    value={editPayout}
                    onChangeText={handleEditPayoutChange}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput
                    label="Interest (₹)"
                    placeholder="e.g. 5000"
                    value={editInterest}
                    onChangeText={handleEditInterestChange}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.modalTwoCol}>
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
                  <FormInput
                    label="Total Repayment (₹)"
                    placeholder="e.g. 55000"
                    value={editTotal}
                    onChangeText={handleEditTotalChange}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput
                    label="Installment (₹)"
                    placeholder="e.g. 1100"
                    value={editCollection}
                    onChangeText={handleEditCollectionChange}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <FormInput
                label="Total Installments / Cycles"
                placeholder="e.g. 50"
                value={editDuration}
                onChangeText={handleEditDurationChange}
                keyboardType="numeric"
              />

              <FormInput
                label="Next Collection Due Date (YYYY-MM-DD)"
                placeholder="e.g. 2026-09-15"
                value={editNextDueDate}
                onChangeText={setEditNextDueDate}
              />

              {/* Frequency Selection */}
              <Text style={styles.fieldLabel}>Collection Frequency</Text>
              <View style={styles.freqContainer}>
                {(['daily', 'every_3_days', 'weekly', 'monthly'] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[styles.freqBtn, editFrequency === freq && styles.freqBtnSelected]}
                    onPress={() => setEditFrequency(freq)}
                  >
                    <Text style={[styles.freqBtnText, editFrequency === freq && styles.freqBtnTextSelected]}>
                      {freq.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title={isSaving ? "Saving Terms..." : "Save Updated Terms"}
                onPress={handleSaveTerms}
                style={{ marginTop: SPACING.md }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginRight: SPACING.md,
  },
  backButtonText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    flexWrap: 'wrap',
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  custIdBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  custIdBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#93C5FD',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 2,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  overdueAlertBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  overdueAlertIcon: {
    fontSize: 24,
  },
  overdueAlertTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  overdueAlertDesc: {
    ...TYPOGRAPHY.caption,
    color: '#991B1B',
    lineHeight: 16,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  heroLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  heroAmount: {
    ...TYPOGRAPHY.hero,
    color: COLORS.white,
    marginVertical: SPACING.xs,
  },
  heroSubText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textLight,
  },
  dividerLight: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: SPACING.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  progressLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  progressVal: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  progressBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFg: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  editTermsBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editTermsBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: '#2563EB',
    fontSize: 12,
  },
  infoCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  payoutRow: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomColor: '#DBEAFE',
  },
  payoutRowLabel: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#1D4ED8',
  },
  payoutRowValue: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  dueDateVal: {
    color: COLORS.secondary,
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
    marginTop: SPACING.md,
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
  historyCard: {
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  modalCloseText: {
    fontSize: 20,
    color: COLORS.textMuted,
    padding: 4,
  },
  modalTwoCol: {
    flexDirection: 'row',
  },
  errorTextBanner: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    backgroundColor: '#FEF2F2',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  freqContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  freqBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  freqBtnSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  freqBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  freqBtnTextSelected: {
    color: COLORS.white,
  },
});

export default CustomerDetailScreen;

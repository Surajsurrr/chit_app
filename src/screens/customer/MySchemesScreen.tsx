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
import { formatFrequency, formatDateLong } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';
import { Scheme } from '../../data/mockData';

export const MySchemesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    schemes,
    getCustomerStats,
    recordPayment,
    updateCustomerScheme,
    logout,
  } = useChitData();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  // Payment modal state
  const [isPayModalVisible, setIsPayModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank Transfer'>('UPI');
  const [payError, setPayError] = useState('');
  const [selectedSchemeForPay, setSelectedSchemeForPay] = useState<Scheme | null>(null);

  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Customer account not selected.</Text>
        <Button title="Log Out" onPress={() => logout()} />
      </SafeAreaView>
    );
  }

  const stats = getCustomerStats(customer.id);
  const enrolledIds = customer.enrolledSchemeIds || (customer.schemeId ? [customer.schemeId] : []);
  const availedSchemes = schemes.filter((s) => enrolledIds.includes(s.id));
  const otherAvailableSchemes = schemes.filter((s) => !enrolledIds.includes(s.id));

  const handleOpenPay = (schemeToPay: Scheme) => {
    setSelectedSchemeForPay(schemeToPay);
    setPayAmount(schemeToPay.collectionAmount.toString());
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
      setPayError(result.error || 'Payment failed to record');
    }
  };

  const handleAvailScheme = (schemeToAvail: Scheme) => {
    const interest = schemeToAvail.interestAmount || 0;
    const payout = schemeToAvail.payoutAmount || (schemeToAvail.totalAmount - interest);

    Alert.alert(
      'Avail Chit Scheme',
      `Would you like to avail "${schemeToAvail.name}"?\n\n• Total Scheme Value: ₹${schemeToAvail.totalAmount.toLocaleString('en-IN')}\n• Upfront Net Payout: ₹${payout.toLocaleString('en-IN')}\n• Installment: ₹${schemeToAvail.collectionAmount.toLocaleString('en-IN')} (${formatFrequency(schemeToAvail.frequency)})\n• Duration: ${schemeToAvail.durationWeeksOrMonths} collections`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Avail',
          onPress: async () => {
            const res = await updateCustomerScheme(customer.id, schemeToAvail.id);
            if (res.success) {
              Alert.alert(
                'Scheme Availed! 🎉',
                `You have successfully availed "${schemeToAvail.name}". It is now listed under your availed schemes.`
              );
            } else {
              Alert.alert('Error', res.error || 'Failed to avail scheme');
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (schemeToSet: Scheme) => {
    const res = await updateCustomerScheme(customer.id, schemeToSet.id);
    if (res.success) {
      Alert.alert('Active Scheme Updated', `"${schemeToSet.name}" is now set as your active primary scheme.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>MEMBER PORTAL</Text>
          <Text style={styles.headerTitle}>My Schemes</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.profileBtnText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Section 1: Availed Schemes */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Schemes Availed by Me</Text>
          <Text style={styles.sectionSubtitle}>
            {availedSchemes.length} {availedSchemes.length === 1 ? 'scheme' : 'schemes'} currently enrolled under admin
          </Text>
        </View>

        {availedSchemes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Availed Schemes Yet</Text>
            <Text style={styles.emptyText}>Explore the available admin schemes below and click "Avail Scheme" to join.</Text>
          </Card>
        ) : (
          availedSchemes.map((s) => {
            const isPrimary = s.id === customer.schemeId;
            const interest = s.interestAmount || 0;
            const interestRate = ((interest / s.totalAmount) * 100).toFixed(1);
            const payout = s.payoutAmount || Math.max(0, s.totalAmount - interest);

            return (
              <Card key={s.id} style={[styles.availedCard, isPrimary && styles.primaryAvailedCard]}>
                {/* Header row */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.schemeTitle}>{s.name}</Text>
                    <Text style={styles.schemeTag}>
                      ₹{s.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(s.frequency)}
                    </Text>
                  </View>

                  <View style={styles.badgeCol}>
                    {isPrimary ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>✓ Active Focused</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.setPrimaryBtn}
                        onPress={() => handleSetPrimary(s)}
                      >
                        <Text style={styles.setPrimaryBtnText}>Set Active</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Financial Summary Grid */}
                <View style={styles.financialGrid}>
                  <View style={styles.finCol}>
                    <Text style={styles.finLabel}>TOTAL VALUE</Text>
                    <Text style={styles.finValue}>₹{s.totalAmount.toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.finCol}>
                    <Text style={styles.finLabel}>INTEREST ({interestRate}%)</Text>
                    <Text style={styles.finInterest}>- ₹{interest.toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.finColMain}>
                    <Text style={styles.finNetLabel}>NET UPFRONT PAYOUT</Text>
                    <Text style={styles.finNetValue}>₹{payout.toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {/* Repayment Progress bar */}
                {isPrimary && (
                  <View style={styles.progressBox}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>PAID SO FAR</Text>
                      <Text style={styles.progressVal}>
                        ₹{stats.paidAmount.toLocaleString('en-IN')} of ₹{s.totalAmount.toLocaleString('en-IN')} ({stats.progressPercentage}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFg, { width: `${stats.progressPercentage}%` }]} />
                    </View>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionRow}>
                  <Button
                    title={`Make Payment (₹${s.collectionAmount.toLocaleString('en-IN')})`}
                    onPress={() => handleOpenPay(s)}
                    style={styles.payBtn}
                    variant="success"
                  />
                </View>
              </Card>
            );
          })
        )}

        {/* Section 2: Explore & Avail Other Admin Schemes */}
        {otherAvailableSchemes.length > 0 && (
          <>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.sectionTitle}>Explore Admin Schemes</Text>
              <Text style={styles.sectionSubtitle}>Avail additional chit schemes offered by the admin</Text>
            </View>

            {otherAvailableSchemes.map((s) => {
              const interest = s.interestAmount || 0;
              const interestRate = ((interest / s.totalAmount) * 100).toFixed(1);
              const payout = s.payoutAmount || Math.max(0, s.totalAmount - interest);

              return (
                <Card key={s.id} style={styles.exploreCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1, marginRight: SPACING.sm }}>
                      <Text style={styles.schemeTitle}>{s.name}</Text>
                      <Text style={styles.schemeTag}>
                        ₹{s.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(s.frequency)} ({s.durationWeeksOrMonths} collections)
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.availBtn}
                      onPress={() => handleAvailScheme(s)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.availBtnText}>Avail Scheme →</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.financialGrid}>
                    <View style={styles.finCol}>
                      <Text style={styles.finLabel}>TOTAL VALUE</Text>
                      <Text style={styles.finValue}>₹{s.totalAmount.toLocaleString('en-IN')}</Text>
                    </View>

                    <View style={styles.finCol}>
                      <Text style={styles.finLabel}>INTEREST ({interestRate}%)</Text>
                      <Text style={styles.finInterest}>- ₹{interest.toLocaleString('en-IN')}</Text>
                    </View>

                    <View style={styles.finColMain}>
                      <Text style={styles.finNetLabel}>NET PAYOUT</Text>
                      <Text style={styles.finNetValue}>₹{payout.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  {s.description ? (
                    <Text style={styles.schemeDesc}>{s.description}</Text>
                  ) : null}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Make Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPayModalVisible}
        onRequestClose={() => setIsPayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Pay Dues — {selectedSchemeForPay?.name || 'Chit Scheme'}
              </Text>
              <TouchableOpacity onPress={() => setIsPayModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalCustName}>{customer.name}</Text>

              <View style={styles.modalStatsCard}>
                <Text style={styles.statsLabel}>REMAINING DUES</Text>
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
                title="Confirm & Pay Now"
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerSub: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    marginTop: 2,
  },
  profileBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  profileBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  sectionHeaderBox: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  availedCard: {
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  primaryAvailedCard: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schemeTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  schemeTag: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  badgeCol: {
    alignItems: 'flex-end',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#065F46',
    fontSize: 11,
  },
  setPrimaryBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 8,
  },
  setPrimaryBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  financialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  finCol: {
    flex: 1,
  },
  finColMain: {
    flex: 1.2,
    alignItems: 'flex-end',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 4,
    borderRadius: 6,
  },
  finLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
  },
  finValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginTop: 2,
  },
  finInterest: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#D97706',
    marginTop: 2,
  },
  finNetLabel: {
    ...TYPOGRAPHY.captionBold,
    color: '#047857',
    fontSize: 9,
  },
  finNetValue: {
    ...TYPOGRAPHY.amountMedium,
    color: '#059669',
    fontSize: 14,
    marginTop: 2,
  },
  progressBox: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  progressVal: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    fontSize: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFg: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  actionRow: {
    marginTop: SPACING.xs,
  },
  payBtn: {
    width: '100%',
  },
  exploreCard: {
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  availBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  availBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  schemeDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
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
});

export default MySchemesScreen;

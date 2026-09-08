import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { StatusBar } from 'expo-status-bar';

export const AddCustomerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { customers, addCustomer } = useChitData();
  const scrollRef = useRef<ScrollView>(null);

  // Compute next suggested Customer ID e.g. CUST-101
  let maxIdNum = 100;
  customers.forEach((c) => {
    const match = c.id.match(/^CUST-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdNum) maxIdNum = num;
    }
  });
  const suggestedId = `CUST-${maxIdNum + 1}`;

  // Form fields
  const [customerId, setCustomerId] = useState(suggestedId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  // Lending terms
  const [payoutAmount, setPayoutAmount] = useState('50000');
  const [interestAmount, setInterestAmount] = useState('5000');
  const [totalAmount, setTotalAmount] = useState('55000');
  const [collectionAmount, setCollectionAmount] = useState('1100');
  const [frequency, setFrequency] = useState<'daily' | 'every_3_days' | 'weekly' | 'monthly'>('daily');
  const [durationInstallments, setDurationInstallments] = useState('50');

  // Form errors & submission states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success modal state
  const [successCustomer, setSuccessCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
    pin: string;
    payoutAmount: number;
    totalAmount: number;
    collectionAmount: number;
    frequency: string;
  } | null>(null);

  // Input change handlers that auto-clear errors
  const handleNameChange = (val: string) => {
    setName(val);
    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
    if (submitError) setSubmitError('');
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
    if (submitError) setSubmitError('');
  };

  const handlePinChange = (val: string) => {
    setPin(val);
    if (errors.pin) setErrors((prev) => ({ ...prev, pin: '' }));
    if (submitError) setSubmitError('');
  };

  // Auto-compute Total Installments / Cycles: TI/C = Total Repayment / Installment
  const computeCycles = (repayment: number, installment: number): string => {
    if (repayment > 0 && installment > 0) {
      const cycles = Math.ceil(repayment / installment);
      return cycles > 0 ? cycles.toString() : '';
    }
    return '';
  };

  // Auto-calculate Total Repayment & Installments when Payout changes
  const handlePayoutChange = (val: string) => {
    setPayoutAmount(val);
    if (errors.payoutAmount) setErrors((prev) => ({ ...prev, payoutAmount: '' }));
    if (submitError) setSubmitError('');
    const p = parseFloat(val) || 0;
    const i = parseFloat(interestAmount) || 0;
    const tot = p + i;
    setTotalAmount(tot > 0 ? tot.toString() : '');
    const col = parseFloat(collectionAmount) || 0;
    if (col > 0 && tot > 0) {
      setDurationInstallments(computeCycles(tot, col));
    }
  };

  // Auto-calculate Total Repayment & Installments when Interest changes
  const handleInterestChange = (val: string) => {
    setInterestAmount(val);
    if (errors.interestAmount) setErrors((prev) => ({ ...prev, interestAmount: '' }));
    if (submitError) setSubmitError('');
    const p = parseFloat(payoutAmount) || 0;
    const i = parseFloat(val) || 0;
    const tot = p + i;
    setTotalAmount(tot > 0 ? tot.toString() : '');
    const col = parseFloat(collectionAmount) || 0;
    if (col > 0 && tot > 0) {
      setDurationInstallments(computeCycles(tot, col));
    }
  };

  // Auto-calculate Installments / Cycles when Total Repayment changes directly
  const handleTotalChange = (val: string) => {
    setTotalAmount(val);
    if (errors.totalAmount) setErrors((prev) => ({ ...prev, totalAmount: '' }));
    if (submitError) setSubmitError('');
    const tot = parseFloat(val) || 0;
    const p = parseFloat(payoutAmount) || 0;
    if (tot >= p && p > 0) {
      setInterestAmount((tot - p).toString());
    }
    const col = parseFloat(collectionAmount) || 0;
    if (col > 0 && tot > 0) {
      setDurationInstallments(computeCycles(tot, col));
    }
  };

  // TI/C = amount repayment / installment (Auto-calculate Total Installments when Installment changes)
  const handleCollectionChange = (val: string) => {
    setCollectionAmount(val);
    if (errors.collectionAmount) setErrors((prev) => ({ ...prev, collectionAmount: '' }));
    if (submitError) setSubmitError('');
    const col = parseFloat(val) || 0;
    const tot = parseFloat(totalAmount) || 0;
    if (col > 0 && tot > 0) {
      setDurationInstallments(computeCycles(tot, col));
    }
  };

  // If user adjusts Total Installments / Cycles manually, adjust Installment amount
  const handleDurationChange = (val: string) => {
    setDurationInstallments(val);
    if (submitError) setSubmitError('');
    const dur = parseInt(val, 10) || 0;
    const tot = parseFloat(totalAmount) || 0;
    if (dur > 0 && tot > 0) {
      setCollectionAmount(Math.round(tot / dur).toString());
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const missing: string[] = [];

    if (!name.trim()) {
      newErrors.name = 'Customer name is required';
      missing.push('Customer Name');
    }

    if (!phone.trim()) {
      newErrors.phone = 'Mobile number is required';
      missing.push('10-digit Mobile Number');
    } else if (!/^\d{10}$/.test(phone.trim())) {
      newErrors.phone = 'Phone must be exactly 10 digits';
      missing.push('valid 10-digit Mobile Number');
    }

    if (!pin.trim()) {
      newErrors.pin = '4-digit login PIN is required';
      missing.push('4-digit PIN');
    } else if (!/^\d{4}$/.test(pin.trim())) {
      newErrors.pin = 'PIN must be exactly 4 digits (e.g. 1234)';
      missing.push('exact 4-digit PIN');
    }

    const pAmt = parseFloat(payoutAmount);
    if (!payoutAmount || isNaN(pAmt) || pAmt <= 0) {
      newErrors.payoutAmount = 'Payout amount must be greater than 0';
      missing.push('Payout Amount');
    }

    const totAmt = parseFloat(totalAmount);
    if (!totalAmount || isNaN(totAmt) || totAmt <= 0) {
      newErrors.totalAmount = 'Total repayment amount must be greater than 0';
      missing.push('Total Repayment');
    }

    const colAmt = parseFloat(collectionAmount);
    if (!collectionAmount || isNaN(colAmt) || colAmt <= 0) {
      newErrors.collectionAmount = 'Collection amount must be greater than 0';
      missing.push('Collection Amount');
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setSubmitError(`⚠️ Please fill in: ${missing.join(', ')}.`);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return false;
    }

    setSubmitError('');
    return true;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    const cleanId = (customerId.trim() || suggestedId).toUpperCase();
    const registeredName = name.trim();
    const registeredPhone = phone.trim();
    const registeredPin = pin.trim();
    const pAmt = parseFloat(payoutAmount);
    const iAmt = parseFloat(interestAmount) || 0;
    const totAmt = parseFloat(totalAmount) || (pAmt + iAmt);
    const colAmt = parseFloat(collectionAmount);
    const dur = parseInt(durationInstallments, 10) || 50;
    const rate = pAmt > 0 ? (iAmt / pAmt) * 100 : 0;

    const res = await addCustomer({
      id: cleanId,
      name: registeredName,
      phone: registeredPhone,
      pin: registeredPin,
      payoutAmount: pAmt,
      interestAmount: iAmt,
      interestRate: rate,
      totalAmount: totAmt,
      amountGiven: totAmt,
      collectionAmount: colAmt,
      frequency,
      durationInstallments: dur,
      startDate: new Date().toISOString(),
      schemeId: '',
    });

    setIsSubmitting(false);

    if (res.success) {
      setSuccessCustomer({
        id: cleanId,
        name: registeredName,
        phone: registeredPhone,
        pin: registeredPin,
        payoutAmount: pAmt,
        totalAmount: totAmt,
        collectionAmount: colAmt,
        frequency,
      });
    } else {
      setSubmitError(`⚠️ ${res.error || 'Could not create customer account.'}`);
      Alert.alert('Registration Failed', res.error || 'Could not create customer account.');
    }
  };

  const handleShareWhatsApp = async () => {
    if (!successCustomer) return;
    const msg = `Hello ${successCustomer.name},\nYour ChitFlow account has been created!\n\n📋 Customer ID: ${successCustomer.id}\n🔐 Login PIN: ${successCustomer.pin}\n\n💰 Principal Disbursed: ₹${successCustomer.payoutAmount.toLocaleString('en-IN')}\n💵 Total Repayable: ₹${successCustomer.totalAmount.toLocaleString('en-IN')}\n📅 Installment: ₹${successCustomer.collectionAmount.toLocaleString('en-IN')} (${successCustomer.frequency})\n\nYou can sign in using your Customer ID or Phone number at any time.`;
    const cleanPhone = successCustomer.phone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Customer</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer ID & Login Credentials */}
          <Text style={styles.sectionHeaderTitle}>Customer Identification & Login</Text>
          <Card style={styles.sectionCard}>
            <FormInput
              label="Customer ID (Unique Identifier)"
              placeholder="e.g. CUST-101"
              value={customerId}
              onChangeText={setCustomerId}
              autoCapitalize="characters"
              error={errors.customerId}
            />

            <FormInput
              label="Customer Full Name *"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChangeText={handleNameChange}
              error={errors.name}
            />

            <FormInput
              label="Mobile Number * (Used for Login & Reminders)"
              placeholder="e.g. 9876543210"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="numeric"
              maxLength={10}
              error={errors.phone}
            />

            <FormInput
              label="Set 4-Digit Login PIN *"
              placeholder="e.g. 1234"
              value={pin}
              onChangeText={handlePinChange}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry={false}
              error={errors.pin}
            />
          </Card>

          {/* Direct Lending Terms Card */}
          <Text style={styles.sectionHeaderTitle}>Lending & Collection Terms</Text>
          <Card style={styles.sectionCard}>
            <View style={styles.twoColRow}>
              <View style={{ flex: 1, marginRight: SPACING.sm }}>
                <FormInput
                  label="Payout Given (₹)"
                  placeholder="e.g. 50000"
                  value={payoutAmount}
                  onChangeText={handlePayoutChange}
                  keyboardType="numeric"
                  error={errors.payoutAmount}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormInput
                  label="Interest Amount (₹)"
                  placeholder="e.g. 5000"
                  value={interestAmount}
                  onChangeText={handleInterestChange}
                  keyboardType="numeric"
                  error={errors.interestAmount}
                />
              </View>
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1, marginRight: SPACING.sm }}>
                <FormInput
                  label="Total Repayment (₹)"
                  placeholder="e.g. 55000"
                  value={totalAmount}
                  onChangeText={handleTotalChange}
                  keyboardType="numeric"
                  error={errors.totalAmount}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormInput
                  label="Installment (₹)"
                  placeholder="e.g. 1100"
                  value={collectionAmount}
                  onChangeText={handleCollectionChange}
                  keyboardType="numeric"
                  error={errors.collectionAmount}
                />
              </View>
            </View>

            <FormInput
              label="Total Installments / Cycles"
              placeholder="e.g. 50"
              value={durationInstallments}
              onChangeText={handleDurationChange}
              keyboardType="numeric"
            />

            {/* Collection Frequency */}
            <Text style={styles.fieldLabel}>Collection Frequency</Text>
            <View style={styles.freqContainer}>
              {(['daily', 'every_3_days', 'weekly', 'monthly'] as const).map((freqOption) => {
                const isSelected = frequency === freqOption;
                const label = freqOption.replace(/_/g, ' ');
                return (
                  <TouchableOpacity
                    key={freqOption}
                    style={[styles.freqBtn, isSelected ? styles.freqBtnSelected : null]}
                    onPress={() => setFrequency(freqOption)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.freqBtnText, isSelected ? styles.freqBtnTextSelected : null]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Live Summary Preview */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>TERMS SUMMARY</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Customer ID:</Text>
              <Text style={styles.summaryVal}>{customerId || suggestedId}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount Disbursed (Payout):</Text>
              <Text style={styles.summaryVal}>₹{(parseFloat(payoutAmount) || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Customer Repays:</Text>
              <Text style={[styles.summaryVal, { color: COLORS.secondary, fontWeight: '700' }]}>
                ₹{(parseFloat(totalAmount) || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Collection Plan:</Text>
              <Text style={styles.summaryVal}>
                ₹{(parseFloat(collectionAmount) || 0).toLocaleString('en-IN')} / {frequency.replace(/_/g, ' ')} ({durationInstallments || 50} times)
              </Text>
            </View>
          </Card>

          {/* Prominent Error Banner above Button */}
          {submitError ? (
            <View style={styles.errorAlertBanner}>
              <Text style={styles.errorAlertIcon}>⚠️</Text>
              <Text style={styles.errorAlertText}>{submitError}</Text>
            </View>
          ) : null}

          <Button
            title={isSubmitting ? "Creating Account & Activating..." : "Save Customer & Activate Terms"}
            onPress={handleSubmit}
            style={styles.submitBtn}
            size="large"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Registration Success Modal */}
      {successCustomer && (
        <Modal
          visible={!!successCustomer}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setSuccessCustomer(null);
            navigation.goBack();
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.successCard}>
              <View style={styles.successBadgeOuter}>
                <View style={styles.successBadgeInner}>
                  <Text style={styles.successBadgeEmoji}>🎉</Text>
                </View>
              </View>

              <Text style={styles.successModalTitle}>Customer Added Successfully!</Text>
              <Text style={styles.successModalGreeting}>
                "{successCustomer.name}" is now registered
              </Text>

              <View style={styles.custIdHighlightBox}>
                <Text style={styles.custIdHighlightLabel}>CUSTOMER ID (LOGIN ID)</Text>
                <Text style={styles.custIdHighlightVal}>{successCustomer.id}</Text>
              </View>

              <View style={styles.detailsContainer}>
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <Text style={styles.detailLabel}>Mobile Number</Text>
                  <Text style={styles.detailValue}>{successCustomer.phone}</Text>
                </View>
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <Text style={styles.detailLabel}>4-Digit Login PIN</Text>
                  <Text style={[styles.detailValue, { color: COLORS.secondary, fontWeight: '700' }]}>
                    {successCustomer.pin}
                  </Text>
                </View>
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <Text style={styles.detailLabel}>Disbursed Payout</Text>
                  <Text style={styles.detailValue}>₹{successCustomer.payoutAmount.toLocaleString('en-IN')}</Text>
                </View>
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <Text style={styles.detailLabel}>Total Repayment</Text>
                  <Text style={[styles.detailValue, { fontWeight: '700' }]}>
                    ₹{successCustomer.totalAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Installment Schedule</Text>
                  <Text style={styles.detailValue}>
                    ₹{successCustomer.collectionAmount.toLocaleString('en-IN')} / {successCustomer.frequency.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.waShareBtn}
                onPress={handleShareWhatsApp}
                activeOpacity={0.8}
              >
                <Text style={styles.waShareBtnText}>💬 Share Credentials on WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successDoneBtn}
                onPress={() => {
                  setSuccessCustomer(null);
                  navigation.goBack();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.successDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.primary,
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
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  sectionHeaderTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.xs + 2,
    marginTop: SPACING.sm,
  },
  sectionCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  twoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: SPACING.sm,
  },
  summaryBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: '#0284C7',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
  },
  summaryVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  errorAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  errorAlertIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  errorAlertText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#B91C1C',
    flex: 1,
    lineHeight: 20,
  },
  submitBtn: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  successCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  successBadgeOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  successBadgeInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadgeEmoji: {
    fontSize: 24,
  },
  successModalTitle: {
    ...TYPOGRAPHY.h2,
    color: '#15803D',
    textAlign: 'center',
    marginBottom: 4,
  },
  successModalGreeting: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  custIdHighlightBox: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  custIdHighlightLabel: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: '#3B82F6',
  },
  custIdHighlightVal: {
    ...TYPOGRAPHY.h2,
    fontSize: 22,
    color: '#1D4ED8',
    letterSpacing: 1,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  detailLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
  },
  detailValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  waShareBtn: {
    width: '100%',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  waShareBtnText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  successDoneBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  successDoneBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.textMuted,
  },
});

export default AddCustomerScreen;

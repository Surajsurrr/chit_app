import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { StatusBar } from 'expo-status-bar';

export const AddCustomerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { schemes, addCustomer } = useChitData();

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [amountGiven, setAmountGiven] = useState('');
  const [collectionAmount, setCollectionAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'every_3_days' | 'weekly' | 'monthly'>('daily');

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Success modal state
  const [successCustomer, setSuccessCustomer] = useState<{
    name: string;
    phone: string;
    pin: string;
    schemeName: string;
  } | null>(null);

  const handleSchemeSelect = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    const scheme = schemes.find((s) => s.id === schemeId);
    if (scheme) {
      setAmountGiven(scheme.totalAmount.toString());
      setCollectionAmount(scheme.collectionAmount.toString());
      setFrequency(scheme.frequency);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone.trim())) {
      newErrors.phone = 'Phone must be a valid 10-digit number';
    }

    if (!pin) {
      newErrors.pin = 'Login PIN is required';
    } else if (!/^\d{4}$/.test(pin)) {
      newErrors.pin = 'PIN must be exactly 4 digits';
    }

    if (!selectedSchemeId) newErrors.scheme = 'Please select a chit scheme';

    const amtGiven = parseFloat(amountGiven);
    if (!amountGiven) {
      newErrors.amountGiven = 'Total scheme amount is required';
    } else if (isNaN(amtGiven) || amtGiven <= 0) {
      newErrors.amountGiven = 'Amount must be greater than 0';
    }

    const colAmt = parseFloat(collectionAmount);
    if (!collectionAmount) {
      newErrors.collectionAmount = 'Collection amount is required';
    } else if (isNaN(colAmt) || colAmt <= 0) {
      newErrors.collectionAmount = 'Collection amount must be greater than 0';
    } else if (colAmt > amtGiven) {
      newErrors.collectionAmount = 'Collection amount cannot exceed total scheme amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const registeredName = name.trim();
    const registeredPhone = phone.trim();
    const registeredPin = pin.trim();
    const chosenScheme = schemes.find((s) => s.id === selectedSchemeId);

    addCustomer({
      name: registeredName,
      phone: registeredPhone,
      pin: registeredPin,
      schemeId: selectedSchemeId,
      amountGiven: parseFloat(amountGiven),
      collectionAmount: parseFloat(collectionAmount),
      frequency,
      startDate: new Date().toISOString(),
    });

    setSuccessCustomer({
      name: registeredName,
      phone: registeredPhone,
      pin: registeredPin,
      schemeName: chosenScheme ? chosenScheme.name : 'Chit Scheme',
    });
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Form Inputs */}
        <FormInput
          label="Customer Name"
          placeholder="e.g. Ravi Kumar"
          value={name}
          onChangeText={setName}
          error={errors.name}
        />

        <FormInput
          label="Phone Number"
          placeholder="e.g. 9876543210"
          value={phone}
          onChangeText={setPhone}
          keyboardType="numeric"
          maxLength={10}
          error={errors.phone}
        />

        <FormInput
          label="Set Member Login PIN (4 Digits)"
          placeholder="e.g. 1234"
          value={pin}
          onChangeText={setPin}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry={true}
          error={errors.pin}
        />

        {/* Scheme Selector */}
        <Text style={styles.sectionLabel}>Select Chit Scheme</Text>
        {errors.scheme ? <Text style={styles.errorText}>{errors.scheme}</Text> : null}
        <View style={styles.schemeContainer}>
          {schemes.map((scheme) => {
            const isSelected = selectedSchemeId === scheme.id;
            return (
              <TouchableOpacity
                key={scheme.id}
                style={[
                  styles.schemeCard,
                  isSelected ? styles.schemeCardSelected : null,
                ]}
                onPress={() => handleSchemeSelect(scheme.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.schemeName, isSelected ? styles.schemeTextSelected : null]}>
                  {scheme.name}
                </Text>
                <Text style={[styles.schemeSub, isSelected ? styles.schemeSubSelected : null]}>
                  ₹{scheme.totalAmount.toLocaleString('en-IN')} · ₹{scheme.collectionAmount.toLocaleString('en-IN')}/{scheme.frequency}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Financial Fields (autofilled but editable) */}
        <FormInput
          label="Total Scheme Amount (₹)"
          placeholder="e.g. 50000"
          value={amountGiven}
          onChangeText={setAmountGiven}
          keyboardType="numeric"
          error={errors.amountGiven}
        />

        <FormInput
          label="Collection Amount (₹)"
          placeholder="e.g. 1000"
          value={collectionAmount}
          onChangeText={setCollectionAmount}
          keyboardType="numeric"
          error={errors.collectionAmount}
        />

        {/* Frequency selector (if overriding) */}
        <Text style={styles.sectionLabel}>Collection Frequency</Text>
        <View style={styles.freqContainer}>
          {(['daily', 'every_3_days', 'weekly', 'monthly'] as const).map((freqOption) => {
            const isSelected = frequency === freqOption;
            const label = freqOption.replace(/_/g, ' ');
            return (
              <TouchableOpacity
                key={freqOption}
                style={[
                  styles.freqBtn,
                  isSelected ? styles.freqBtnSelected : null,
                ]}
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

        <Button
          title="Register Customer"
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

              <Text style={styles.successModalTitle}>Customer Registered Successfully! 🎉</Text>
              <Text style={styles.successModalGreeting}>
                "{successCustomer.name}" is now enrolled
              </Text>
              <Text style={styles.successModalMessage}>
                Member account has been created and assigned to the selected chit scheme. They can sign in using their phone and PIN.
              </Text>

              <View style={styles.detailsContainer}>
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <Text style={styles.detailLabel}>Customer Name</Text>
                  <Text style={styles.detailValue}>{successCustomer.name}</Text>
                </View>
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <Text style={styles.detailValue}>{successCustomer.phone}</Text>
                </View>
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <Text style={styles.detailLabel}>Assigned Scheme</Text>
                  <Text style={styles.detailValue}>{successCustomer.schemeName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Login PIN</Text>
                  <Text style={[styles.detailValue, { color: COLORS.secondary, fontWeight: '700' }]}>
                    {successCustomer.pin}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.successPrimaryBtn}
                onPress={() => {
                  setSuccessCustomer(null);
                  navigation.goBack();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.successPrimaryBtnText}>Done / Back to Customers →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.successSecondaryBtn}
                onPress={() => {
                  setSuccessCustomer(null);
                  setName('');
                  setPhone('');
                  setPin('');
                  setSelectedSchemeId('');
                  setAmountGiven('');
                  setCollectionAmount('');
                  setErrors({});
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.successSecondaryBtnText}>+ Register Another Member</Text>
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
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  scrollContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  sectionLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryLight,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  schemeContainer: {
    marginBottom: SPACING.md,
  },
  schemeCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  schemeCardSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondaryLight,
  },
  schemeName: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  schemeSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  schemeTextSelected: {
    color: COLORS.secondary,
  },
  schemeSubSelected: {
    color: COLORS.secondary,
    opacity: 0.8,
  },
  freqContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.lg,
  },
  freqBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    margin: SPACING.xs,
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
  submitBtn: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    marginBottom: SPACING.sm,
    marginTop: -SPACING.xs,
  },
  // Success Modal Styles
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successBadgeInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadgeEmoji: {
    fontSize: 26,
  },
  successModalTitle: {
    ...TYPOGRAPHY.h2,
    color: '#15803D',
    textAlign: 'center',
    marginBottom: 4,
  },
  successModalGreeting: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  successModalMessage: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 1,
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
  successPrimaryBtn: {
    width: '100%',
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  successPrimaryBtnText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  successSecondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    backgroundColor: '#F1F5F9',
  },
  successSecondaryBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.textMuted,
  },
});

export default AddCustomerScreen;

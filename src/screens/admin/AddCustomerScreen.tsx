import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { StatusBar } from 'expo-status-bar';

export const AddCustomerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { schemes, addCustomer } = useChitData();

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [amountGiven, setAmountGiven] = useState('');
  const [collectionAmount, setCollectionAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'every_3_days' | 'weekly' | 'monthly'>('daily');

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      schemeId: selectedSchemeId,
      amountGiven: parseFloat(amountGiven),
      collectionAmount: parseFloat(collectionAmount),
      frequency,
      startDate: new Date().toISOString(),
    });

    Alert.alert(
      'Success',
      'Customer registered successfully!',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Customer</Text>
      </View>

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
});

export default AddCustomerScreen;

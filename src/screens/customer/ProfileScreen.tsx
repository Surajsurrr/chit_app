import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { formatDateLong, formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    schemes,
    getCustomerStats,
    updateCustomerProfile,
    logout,
    isCustomerProfileComplete,
    currentAdmin,
    isAdminProfileComplete,
  } = useChitData();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  // Edit Modal states
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editNomineeName, setEditNomineeName] = useState('');
  const [editNomineeRelation, setEditNomineeRelation] = useState('');
  const [editIdProofType, setEditIdProofType] = useState<
    'Aadhaar' | 'PAN' | 'Voter ID' | 'Driving License'
  >('Aadhaar');
  const [editIdProofNumber, setEditIdProofNumber] = useState('');
  const [editPin, setEditPin] = useState('');

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Customer account not selected.</Text>
        <Button title="Log Out" onPress={() => logout()} />
      </SafeAreaView>
    );
  }

  const scheme = schemes.find((s) => s.id === customer.schemeId);
  const enrolledSnapshot = customer.enrolledSchemes?.find((es) => es.schemeId === customer.schemeId)
    || customer.enrolledSchemes?.[customer.enrolledSchemes.length - 1];
  const activeSchemeName = enrolledSnapshot?.schemeName || scheme?.name || 'Active Scheme';
  const activeSchemeValue = enrolledSnapshot?.totalAmount || customer.amountGiven;
  const stats = getCustomerStats(customer.id);

  const nameInitials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleOpenEdit = () => {
    setEditName(customer.name || '');
    setEditPhone(customer.phone || '');
    setEditEmail(customer.email || '');
    setEditAddress(customer.address || '');
    setEditCity(customer.city || '');
    setEditPincode(customer.pincode || '');
    setEditOccupation(customer.occupation || '');
    setEditNomineeName(customer.nomineeName || '');
    setEditNomineeRelation(customer.nomineeRelation || '');
    setEditIdProofType(customer.idProofType || 'Aadhaar');
    setEditIdProofNumber(customer.idProofNumber || '');
    setEditPin(customer.pin || '');
    setFormErrors({});
    setIsEditModalVisible(true);
  };

  const isCustProfileComplete = isCustomerProfileComplete(customer.id);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editName.trim()) {
      errors.name = 'Full name is required (mandatory)';
    }

    const cleanPhone = editPhone.trim().replace(/[^0-9]/g, '');
    if (!editPhone.trim()) {
      errors.phone = 'Phone number is required (mandatory)';
    } else if (cleanPhone.length !== 10) {
      errors.phone = 'Phone must be a valid 10-digit mobile number';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editEmail.trim()) {
      errors.email = 'Email address is required (mandatory to avail schemes)';
    } else if (!emailRegex.test(editEmail.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!editAddress.trim()) {
      errors.address = 'Residential address is required (mandatory to avail schemes)';
    }

    if (editPincode.trim() && !/^\d{6}$/.test(editPincode.trim().replace(/[^0-9]/g, ''))) {
      errors.pincode = 'Pincode must be 6 digits';
    }

    if (editPin.trim() && !/^\d{4}$/.test(editPin.trim())) {
      errors.pin = 'PIN must be exactly 4 digits';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const result = await updateCustomerProfile(customer.id, {
        name: editName.trim(),
        phone: editPhone.trim().replace(/[^0-9]/g, ''),
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
        city: editCity.trim() || undefined,
        pincode: editPincode.trim() || undefined,
        occupation: editOccupation.trim() || undefined,
        nomineeName: editNomineeName.trim() || undefined,
        nomineeRelation: editNomineeRelation.trim() || undefined,
        idProofType: editIdProofType,
        idProofNumber: editIdProofNumber.trim() || undefined,
        pin: editPin.trim() || customer.pin,
      });

      if (result.success) {
        setIsEditModalVisible(false);
        Alert.alert(
          'Profile Updated! 🎉',
          'Your profile details have been saved successfully and are now visible to the administrator.'
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your personal, contact & KYC details</Text>
        </View>
        <TouchableOpacity style={styles.editHeaderBtn} onPress={handleOpenEdit} activeOpacity={0.8}>
          <Text style={styles.editHeaderBtnText}>✏️ Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Customer Profile Completion Status Banner */}
        <View style={isCustProfileComplete ? styles.statusBoxComplete : styles.statusBoxIncomplete}>
          <View style={styles.statusBoxHeader}>
            <Text style={styles.statusBoxIcon}>{isCustProfileComplete ? '✅' : '⚠️'}</Text>
            <View style={{ flex: 1, marginLeft: SPACING.xs + 4 }}>
              <Text style={isCustProfileComplete ? styles.statusTitleComplete : styles.statusTitleIncomplete}>
                {isCustProfileComplete ? 'Member Profile Verified & Complete' : 'Profile Setup Incomplete (Mandatory for Schemes)'}
              </Text>
              <Text style={isCustProfileComplete ? styles.statusSubComplete : styles.statusSubIncomplete}>
                {isCustProfileComplete
                  ? 'Your profile is complete and verified. You are eligible to enroll in and avail any chit scheme.'
                  : 'You cannot avail any scheme until your Email and Residential Address are filled.'}
              </Text>
            </View>
          </View>
          {!isCustProfileComplete && (
            <View style={styles.checklistGrid}>
              <View style={styles.checklistItem}>
                <Text style={customer.name ? styles.checkDone : styles.checkMissing}>
                  {customer.name ? '✓' : '✗'} Full Name
                </Text>
              </View>
              <View style={styles.checklistItem}>
                <Text style={customer.phone && customer.phone.length === 10 ? styles.checkDone : styles.checkMissing}>
                  {customer.phone && customer.phone.length === 10 ? '✓' : '✗'} 10-Digit Phone
                </Text>
              </View>
              <View style={styles.checklistItem}>
                <Text style={customer.email ? styles.checkDone : styles.checkMissing}>
                  {customer.email ? '✓' : '✗'} Email Address
                </Text>
              </View>
              <View style={styles.checklistItem}>
                <Text style={customer.address ? styles.checkDone : styles.checkMissing}>
                  {customer.address ? '✓' : '✗'} Residential Address
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* User Avatar Card */}
        <Card style={styles.userCard} padding={SPACING.lg}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{nameInitials}</Text>
          </View>
          <Text style={styles.userName}>{customer.name}</Text>
          <Text style={styles.userPhone}>📱 +91 {customer.phone}</Text>
          {customer.email ? (
            <Text style={styles.userEmail}>✉️ {customer.email}</Text>
          ) : (
            <TouchableOpacity onPress={handleOpenEdit}>
              <Text style={styles.addEmailPrompt}>+ Add email address</Text>
            </TouchableOpacity>
          )}

          <View style={styles.memberIdBadge}>
            <Text style={styles.memberIdText}>MEMBER ID: {customer.id.toUpperCase()}</Text>
          </View>
        </Card>

        {/* Personal & Contact Information Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Personal & Contact Details</Text>
          <TouchableOpacity onPress={handleOpenEdit}>
            <Text style={styles.sectionEditLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Full Name</Text>
            <Text style={styles.value}>{customer.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone Number</Text>
            <Text style={styles.value}>+91 {customer.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email Address</Text>
            <Text style={[styles.value, !customer.email && styles.placeholderValue]}>
              {customer.email || 'Not provided'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Residential Address</Text>
            <Text style={[styles.value, !customer.address && styles.placeholderValue, { maxWidth: '60%', textAlign: 'right' }]}>
              {customer.address || 'Not provided'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>City & Region</Text>
            <Text style={[styles.value, !customer.city && styles.placeholderValue]}>
              {customer.city || 'Not provided'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pincode / Postal Code</Text>
            <Text style={[styles.value, !customer.pincode && styles.placeholderValue]}>
              {customer.pincode || 'Not provided'}
            </Text>
          </View>
        </Card>

        {/* KYC & Nominee Details Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>KYC & Nominee Details</Text>
          <TouchableOpacity onPress={handleOpenEdit}>
            <Text style={styles.sectionEditLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Occupation</Text>
            <Text style={[styles.value, !customer.occupation && styles.placeholderValue]}>
              {customer.occupation || 'Not provided'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ID Proof Type</Text>
            <Text style={styles.value}>{customer.idProofType || 'Aadhaar'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ID Proof Number</Text>
            <Text style={[styles.value, !customer.idProofNumber && styles.placeholderValue]}>
              {customer.idProofNumber || 'Not provided'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nominee Name</Text>
            <Text style={[styles.value, !customer.nomineeName && styles.placeholderValue]}>
              {customer.nomineeName || 'Not provided'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nominee Relationship</Text>
            <Text style={[styles.value, !customer.nomineeRelation && styles.placeholderValue]}>
              {customer.nomineeRelation || 'Not provided'}
            </Text>
          </View>
        </Card>

        {/* Section: Chit Fund Organizer / Admin Details */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Chit Fund Organizer Details</Text>
        </View>

        <Card style={styles.organizerProfileCard}>
          {isAdminProfileComplete ? (
            <>
              <View style={styles.organizerCardTop}>
                <View style={styles.organizerAvatar}>
                  <Text style={styles.organizerAvatarText}>
                    {currentAdmin?.name ? currentAdmin.name[0].toUpperCase() : '👑'}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <View style={styles.organizerBadge}>
                    <Text style={styles.organizerBadgeText}>👑 VERIFIED ORGANIZER</Text>
                  </View>
                  <Text style={styles.organizerNameText}>{currentAdmin?.name || 'Organizer Admin'}</Text>
                  <Text style={styles.organizerAgencyText}>
                    🏢 {currentAdmin?.businessName || 'ChitFlow Organizer'}
                  </Text>
                </View>
              </View>

              <View style={styles.organizerDivider} />

              <View style={styles.row}>
                <Text style={styles.label}>Primary Phone</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.value}>+91 {currentAdmin?.phone}</Text>
                  {currentAdmin?.phone && (
                    <TouchableOpacity
                      style={styles.miniActionBtn}
                      onPress={() => Linking.openURL(`tel:${currentAdmin.phone}`)}
                    >
                      <Text style={styles.miniActionText}>📞 Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Official Email</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.value}>{currentAdmin?.email}</Text>
                  {currentAdmin?.email && (
                    <TouchableOpacity
                      style={styles.miniActionBtn}
                      onPress={() => Linking.openURL(`mailto:${currentAdmin.email}`)}
                    >
                      <Text style={styles.miniActionText}>✉️ Mail</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <Text style={styles.label}>Office Address</Text>
                <Text style={[styles.value, { maxWidth: '60%', textAlign: 'right' }]}>
                  {currentAdmin?.address}
                  {currentAdmin?.city ? `, ${currentAdmin.city}` : ''}
                  {currentAdmin?.pincode ? ` - ${currentAdmin.pincode}` : ''}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.organizerPendingBox}>
              <Text style={styles.organizerPendingIcon}>⚠️</Text>
              <Text style={styles.organizerPendingTitle}>Organizer Profile Setup Pending</Text>
              <Text style={styles.organizerPendingText}>
                The chit fund administrator has not completed their verified profile setup yet. Schemes remain locked until the organizer completes setup.
              </Text>
            </View>
          )}
        </Card>

        {/* Scheme Terms summary */}
        <Text style={styles.sectionTitle}>Active Chit Scheme Terms</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Associated Scheme</Text>
            <Text style={styles.value}>{activeSchemeName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Scheme Value</Text>
            <Text style={styles.value}>₹{activeSchemeValue.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Installment Amount</Text>
            <Text style={styles.value}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Registration Date</Text>
            <Text style={styles.value}>{formatDateLong(customer.startDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contract Guarantee</Text>
            <Text style={[styles.value, { color: '#059669', fontWeight: '700' }]}>
              🔒 Agreed Terms Locked Forever
            </Text>
          </View>
        </Card>

        {/* Financial progress brief */}
        <Card style={styles.progressBriefCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressTitle}>Repayment Progress</Text>
            <Text style={styles.progressText}>{stats.progressPercentage.toFixed(1)}% Paid</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFg, { width: `${stats.progressPercentage}%` }]} />
          </View>
          <Text style={styles.remainingText}>
            ₹{stats.remainingAmount.toLocaleString('en-IN')} outstanding of ₹
            {customer.amountGiven.toLocaleString('en-IN')} total
          </Text>
        </Card>

        {/* Security & Login Card */}
        <Card style={styles.securityCard}>
          <View style={styles.securityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Account Security & PIN</Text>
              <Text style={styles.securitySub}>4-Digit PIN used to access your member portal</Text>
            </View>
            <TouchableOpacity style={styles.changePinBtn} onPress={handleOpenEdit}>
              <Text style={styles.changePinBtnText}>Change PIN</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Log Out button */}
        <TouchableOpacity style={styles.switchRoleBtn} onPress={() => logout()} activeOpacity={0.8}>
          <Text style={styles.switchRoleText}>Log Out from Account</Text>
        </TouchableOpacity>

        <Text style={styles.footerBuild}>
          ChitFlow Secure Member Portal · All changes sync with Administrator in real time
        </Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Profile Details</Text>
                <Text style={styles.modalSubtitle}>Updates are automatically visible to the Admin</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {/* Form Category: Contact Info */}
              <Text style={styles.formCategoryLabel}>CONTACT & PERSONAL INFO</Text>

              <FormInput
                label="Full Name *"
                placeholder="Enter your full name"
                value={editName}
                onChangeText={(val) => {
                  setEditName(val);
                  setFormErrors((prev) => ({ ...prev, name: '' }));
                }}
                error={formErrors.name}
              />

              <FormInput
                label="Phone Number (10 digits) *"
                placeholder="Enter 10-digit mobile number"
                value={editPhone}
                onChangeText={(val) => {
                  setEditPhone(val);
                  setFormErrors((prev) => ({ ...prev, phone: '' }));
                }}
                keyboardType="phone-pad"
                error={formErrors.phone}
              />

              <FormInput
                label="Email Address *"
                placeholder="e.g. name@example.com"
                value={editEmail}
                onChangeText={(val) => {
                  setEditEmail(val);
                  setFormErrors((prev) => ({ ...prev, email: '' }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={formErrors.email}
              />

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Residential Address *</Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    styles.textArea,
                    formErrors.address ? styles.inputErrorBorder : null,
                  ]}
                  placeholder="Door No, Street Name, Landmark..."
                  placeholderTextColor={COLORS.textLight}
                  value={editAddress}
                  onChangeText={(val) => {
                    setEditAddress(val);
                    setFormErrors((prev) => ({ ...prev, address: '' }));
                  }}
                  multiline={true}
                  numberOfLines={3}
                />
                {formErrors.address ? (
                  <Text style={styles.errorTextSmall}>{formErrors.address}</Text>
                ) : null}
              </View>

              <View style={styles.formRow2}>
                <View style={{ flex: 1, marginRight: SPACING.xs }}>
                  <FormInput
                    label="City / Town"
                    placeholder="e.g. Chennai"
                    value={editCity}
                    onChangeText={setEditCity}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.xs }}>
                  <FormInput
                    label="Pincode (6 digits)"
                    placeholder="e.g. 600004"
                    value={editPincode}
                    onChangeText={(val) => {
                      setEditPincode(val);
                      setFormErrors((prev) => ({ ...prev, pincode: '' }));
                    }}
                    keyboardType="numeric"
                    error={formErrors.pincode}
                  />
                </View>
              </View>

              {/* Form Category: KYC & Nominee */}
              <Text style={styles.formCategoryLabel}>OCCUPATION & KYC DETAILS</Text>

              <FormInput
                label="Occupation / Business"
                placeholder="e.g. Retail Store Owner, Engineer, Consultant"
                value={editOccupation}
                onChangeText={setEditOccupation}
              />

              <Text style={styles.inputLabel}>Government ID Proof Type</Text>
              <View style={styles.idChipRow}>
                {(['Aadhaar', 'PAN', 'Voter ID', 'Driving License'] as const).map((type) => {
                  const isSelected = editIdProofType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.idChip, isSelected && styles.idChipSelected]}
                      onPress={() => setEditIdProofType(type)}
                    >
                      <Text
                        style={[
                          styles.idChipText,
                          isSelected && styles.idChipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormInput
                label={`${editIdProofType} Number`}
                placeholder={`Enter your ${editIdProofType} number`}
                value={editIdProofNumber}
                onChangeText={setEditIdProofNumber}
              />

              <Text style={styles.formCategoryLabel}>NOMINEE DETAILS</Text>

              <FormInput
                label="Nominee Full Name"
                placeholder="Nominee's full name"
                value={editNomineeName}
                onChangeText={setEditNomineeName}
              />

              <FormInput
                label="Nominee Relationship"
                placeholder="e.g. Spouse, Father, Mother, Sibling"
                value={editNomineeRelation}
                onChangeText={setEditNomineeRelation}
              />

              {/* Security PIN update */}
              <Text style={styles.formCategoryLabel}>SECURITY & LOGIN PIN</Text>
              <FormInput
                label="4-Digit Login PIN"
                placeholder="Enter 4-digit PIN"
                value={editPin}
                onChangeText={(val) => {
                  setEditPin(val);
                  setFormErrors((prev) => ({ ...prev, pin: '' }));
                }}
                keyboardType="numeric"
                secureTextEntry={true}
                error={formErrors.pin}
              />

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator color={COLORS.white} size="small" />
                    <Text style={styles.saveBtnText}>Saving Changes...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>Save Profile Changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
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
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 2,
  },
  editHeaderBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editHeaderBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 12,
  },
  scrollContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  statusBoxComplete: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  statusBoxIncomplete: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  statusBoxHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusBoxIcon: {
    fontSize: 22,
  },
  statusTitleComplete: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#065F46',
  },
  statusTitleIncomplete: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#92400E',
  },
  statusSubComplete: {
    ...TYPOGRAPHY.caption,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  statusSubIncomplete: {
    ...TYPOGRAPHY.caption,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    gap: SPACING.xs + 2,
  },
  checklistItem: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  checkDone: {
    ...TYPOGRAPHY.captionBold,
    color: '#047857',
    fontSize: 11,
  },
  checkMissing: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 11,
  },
  organizerProfileCard: {
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  organizerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatarText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    fontSize: 20,
  },
  organizerBadge: {
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  organizerBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#0369A1',
    fontSize: 10,
  },
  organizerNameText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  organizerAgencyText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    marginTop: 2,
  },
  organizerDivider: {
    height: 1,
    backgroundColor: '#BAE6FD',
    marginVertical: SPACING.sm + 2,
  },
  miniActionBtn: {
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: SPACING.xs,
  },
  miniActionText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
  },
  organizerPendingBox: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  organizerPendingIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  organizerPendingTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#92400E',
  },
  organizerPendingText: {
    ...TYPOGRAPHY.caption,
    color: '#B45309',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  errorTextSmall: {
    ...TYPOGRAPHY.caption,
    color: '#EF4444',
    marginTop: 3,
    fontSize: 11,
  },
  userCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    ...TYPOGRAPHY.h1,
    color: COLORS.success,
  },
  userName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  userPhone: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  userEmail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.secondary,
    marginTop: 2,
    fontWeight: '600',
  },
  addEmailPrompt: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    marginTop: 4,
  },
  memberIdBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  memberIdText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  sectionEditLink: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 12,
  },
  detailsCard: {
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    flex: 1,
  },
  value: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  placeholderValue: {
    color: COLORS.textLight,
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  progressBriefCard: {
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  progressText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.success,
  },
  progressBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFg: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  remainingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  securityCard: {
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  securityTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  securitySub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  changePinBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changePinBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: '#2563EB',
    fontSize: 11,
  },
  switchRoleBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.white,
  },
  switchRoleText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.danger,
  },
  footerBuild: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    color: COLORS.textLight,
    marginBottom: SPACING.xl,
    lineHeight: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.danger,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
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
  modalSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: SPACING.xs,
  },
  modalCloseBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  modalScroll: {
    padding: SPACING.lg,
  },
  formCategoryLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    letterSpacing: 1,
    fontSize: 10,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  formRow2: {
    flexDirection: 'row',
  },
  idChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  idChip: {
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  idChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  idChipText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  idChipTextSelected: {
    color: COLORS.white,
  },
  saveBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    elevation: 2,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  cancelBtn: {
    paddingVertical: SPACING.md - 2,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  cancelBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
});

export default ProfileScreen;

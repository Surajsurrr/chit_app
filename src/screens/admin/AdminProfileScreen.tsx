import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { StatusBar } from 'expo-status-bar';
import { lookupPincode } from '../../utils/pincodeService';

export const AdminProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { currentAdmin, updateAdminProfile, getAdminStats, schemes, logout, isAdminProfileComplete } = useChitData();
  const stats = getAdminStats();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationHint, setLocationHint] = useState<string | null>(null);

  const adminName = currentAdmin?.name || currentAdmin?.username || 'Organizer Admin';
  const businessName = currentAdmin?.businessName || 'ChitFlow Organizer';
  const nameInitials = adminName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AD';

  const handlePincodeChange = async (val: string) => {
    setEditPincode(val);
    setFormErrors((prev) => ({ ...prev, pincode: '' }));

    const clean = val.replace(/[^0-9]/g, '');
    if (clean.length === 6) {
      setIsFetchingLocation(true);
      setLocationHint('🔍 Detecting city & district...');
      const res = await lookupPincode(clean);
      setIsFetchingLocation(false);
      if (res.success && res.city) {
        setEditCity(res.city);
        setLocationHint(`✓ Auto-detected: ${res.city}${res.state ? `, ${res.state}` : ''}`);
      } else {
        setLocationHint(null);
      }
    } else {
      setLocationHint(null);
    }
  };

  const handleOpenEdit = () => {
    setEditName(currentAdmin?.name || '');
    setEditBusinessName(currentAdmin?.businessName || '');
    setEditPhone(currentAdmin?.phone || '');
    setEditEmail(currentAdmin?.email || '');
    setEditAddress(currentAdmin?.address || '');
    setEditCity(currentAdmin?.city || '');
    setEditPincode(currentAdmin?.pincode || '');
    setEditUsername(currentAdmin?.username || '');
    setEditPassword('');
    setEditConfirmPassword('');
    setFormErrors({});
    setLocationHint(null);
    setIsFetchingLocation(false);
    setIsEditModalVisible(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editName.trim()) {
      errors.name = 'Full name is required (mandatory)';
    }

    const cleanUsername = editUsername.trim();
    if (!cleanUsername) {
      errors.username = 'Admin login username is required (mandatory)';
    } else if (cleanUsername.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      errors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
    }

    const cleanPhone = editPhone.trim().replace(/[^0-9]/g, '');
    if (!editPhone.trim()) {
      errors.phone = 'Phone number is required (mandatory)';
    } else if (cleanPhone.length !== 10) {
      errors.phone = 'Enter a valid 10-digit phone number';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editEmail.trim()) {
      errors.email = 'Official email is required (mandatory)';
    } else if (!emailRegex.test(editEmail.trim())) {
      errors.email = 'Enter a valid email address';
    }

    if (!editAddress.trim()) {
      errors.address = 'Office / Street address is required (mandatory)';
    }

    if (editPincode.trim()) {
      const cleanPin = editPincode.trim().replace(/[^0-9]/g, '');
      if (cleanPin.length !== 6) {
        errors.pincode = 'Pincode must be 6 digits';
      }
    }

    if (editPassword.trim()) {
      if (editPassword.trim().length < 6) {
        errors.password = 'New password must be at least 6 characters';
      } else if (editPassword !== editConfirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    const updatedData: Record<string, any> = {
      name: editName.trim(),
      businessName: editBusinessName.trim() || undefined,
      phone: editPhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      address: editAddress.trim() || undefined,
      city: editCity.trim() || undefined,
      pincode: editPincode.trim() || undefined,
    };

    const cleanUser = editUsername.trim();
    if (cleanUser && cleanUser.toLowerCase() !== (currentAdmin?.username || '').toLowerCase()) {
      updatedData.newUsername = cleanUser;
    }

    if (editPassword.trim()) {
      updatedData.password = editPassword.trim();
    }

    const res = await updateAdminProfile(updatedData);
    setIsSaving(false);

    if (res.success) {
      setIsEditModalVisible(false);
      Alert.alert(
        'Profile Updated! 🎉',
        'Your organizer profile information and credentials have been updated.'
      );
    } else {
      Alert.alert('Error', res.error || 'Failed to update admin profile');
    }
  };

  const handleCall = () => {
    if (!currentAdmin?.phone) {
      Alert.alert('No Phone', 'Please setup your phone number first.');
      return;
    }
    Linking.openURL(`tel:${currentAdmin.phone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  const handleEmail = () => {
    if (!currentAdmin?.email) {
      Alert.alert('No Email', 'Please setup your email address first.');
      return;
    }
    Linking.openURL(`mailto:${currentAdmin.email}`).catch(() => {
      Alert.alert('Error', 'Unable to open mail client.');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Organizer Profile</Text>
          <Text style={styles.headerSubtitle}>Admin & Chit Fund Details</Text>
        </View>
        <TouchableOpacity
          style={styles.headerLogoutBtn}
          onPress={() => logout()}
          activeOpacity={0.7}
        >
          <Text style={styles.headerLogoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Completion Status Banner */}
        <View style={isAdminProfileComplete ? styles.statusBoxComplete : styles.statusBoxIncomplete}>
          <View style={styles.statusBoxHeader}>
            <Text style={styles.statusBoxIcon}>{isAdminProfileComplete ? '✅' : '⚠️'}</Text>
            <View style={{ flex: 1, marginLeft: SPACING.xs + 4 }}>
              <Text style={isAdminProfileComplete ? styles.statusTitleComplete : styles.statusTitleIncomplete}>
                {isAdminProfileComplete ? 'Organizer Profile Verified & Active' : 'Organizer Profile Setup Incomplete (Mandatory)'}
              </Text>
              <Text style={isAdminProfileComplete ? styles.statusSubComplete : styles.statusSubIncomplete}>
                {isAdminProfileComplete
                  ? 'All chit schemes are visible and available to customers.'
                  : 'Schemes are HIDDEN from customers until all 4 mandatory fields are completed.'}
              </Text>
            </View>
          </View>
          {!isAdminProfileComplete && (
            <View style={styles.checklistGrid}>
              <View style={styles.checklistItem}>
                <Text style={currentAdmin?.name ? styles.checkDone : styles.checkMissing}>
                  {currentAdmin?.name ? '✓' : '✗'} Full Name
                </Text>
              </View>
              <View style={styles.checklistItem}>
                <Text style={currentAdmin?.phone && currentAdmin.phone.length === 10 ? styles.checkDone : styles.checkMissing}>
                  {currentAdmin?.phone && currentAdmin.phone.length === 10 ? '✓' : '✗'} 10-Digit Phone
                </Text>
              </View>
              <View style={styles.checklistItem}>
                <Text style={currentAdmin?.email ? styles.checkDone : styles.checkMissing}>
                  {currentAdmin?.email ? '✓' : '✗'} Official Email
                </Text>
              </View>
              <View style={styles.checklistItem}>
                <Text style={currentAdmin?.address ? styles.checkDone : styles.checkMissing}>
                  {currentAdmin?.address ? '✓' : '✗'} Office Address
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Profile Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{nameInitials}</Text>
            </View>
            <View style={styles.heroDetails}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>👑 ORGANIZER / ADMIN</Text>
              </View>
              <Text style={styles.adminNameText}>{adminName}</Text>
              <Text style={styles.adminUsernameText}>@{currentAdmin?.username || 'admin'}</Text>
              <Text style={styles.businessNameText}>🏢 {businessName}</Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleOpenEdit}
            activeOpacity={0.85}
          >
            <Text style={styles.editBtnText}>✏️ Edit Admin Profile</Text>
          </TouchableOpacity>
        </Card>

        {/* Business & Contact Information */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Business & Contact Information</Text>
          <TouchableOpacity onPress={handleOpenEdit}>
            <Text style={styles.sectionEditLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Organizer Name *</Text>
            <Text style={[styles.infoValue, !currentAdmin?.name && styles.placeholderValue]}>
              {currentAdmin?.name || 'Not configured'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chit Fund / Firm</Text>
            <Text style={[styles.infoValue, !currentAdmin?.businessName && styles.placeholderValue]}>
              {currentAdmin?.businessName || 'Not configured'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary Phone *</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.infoValue, !currentAdmin?.phone && styles.placeholderValue]}>
                {currentAdmin?.phone ? `+91 ${currentAdmin.phone}` : 'Not configured'}
              </Text>
              {currentAdmin?.phone ? (
                <TouchableOpacity style={styles.miniActionBtn} onPress={handleCall}>
                  <Text style={styles.miniActionText}>📞 Call</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Official Email *</Text>
            <View style={styles.rowRight}>
              <Text style={[styles.infoValue, !currentAdmin?.email && styles.placeholderValue]}>
                {currentAdmin?.email || 'Not configured'}
              </Text>
              {currentAdmin?.email ? (
                <TouchableOpacity style={styles.miniActionBtn} onPress={handleEmail}>
                  <Text style={styles.miniActionText}>✉️ Mail</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Office & Operating Address */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Office & Physical Location</Text>
          <TouchableOpacity onPress={handleOpenEdit}>
            <Text style={styles.sectionEditLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Office Address *</Text>
            <Text
              style={[
                styles.infoValue,
                !currentAdmin?.address && styles.placeholderValue,
                { maxWidth: '60%', textAlign: 'right' },
              ]}
            >
              {currentAdmin?.address || 'Not configured'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City / Region</Text>
            <Text style={[styles.infoValue, !currentAdmin?.city && styles.placeholderValue]}>
              {currentAdmin?.city || 'Not configured'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Postal Pincode</Text>
            <Text style={[styles.infoValue, !currentAdmin?.pincode && styles.placeholderValue]}>
              {currentAdmin?.pincode || 'Not configured'}
            </Text>
          </View>
        </Card>

        {/* System & Operational Scope */}
        <Text style={styles.sectionTitle}>System Scope & Operational Overview</Text>
        <Card style={styles.scopeCard}>
          <View style={styles.scopeGrid}>
            <View style={styles.scopeCol}>
              <Text style={styles.scopeLabel}>MEMBERS</Text>
              <Text style={styles.scopeVal}>{stats.totalCustomers}</Text>
            </View>
            <View style={styles.scopeCol}>
              <Text style={styles.scopeLabel}>SCHEMES</Text>
              <Text style={styles.scopeVal}>{schemes.length}</Text>
            </View>
            <View style={styles.scopeCol}>
              <Text style={styles.scopeLabel}>COLLECTED</Text>
              <Text style={styles.scopeVal}>₹{stats.totalCollected.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <View style={styles.scopeNote}>
            <Text style={styles.scopeNoteIcon}>🔒</Text>
            <Text style={styles.scopeNoteText}>
              Your organizer profile details are stored locally and are visible to customers to verify the authenticity of your chit fund.
            </Text>
          </View>
        </Card>

        {/* Security & Credentials */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Security & Credentials</Text>
          <TouchableOpacity onPress={handleOpenEdit}>
            <Text style={styles.sectionEditLink}>Change</Text>
          </TouchableOpacity>
        </View>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Login Username</Text>
            <Text style={styles.infoValue}>@{currentAdmin?.username || 'admin'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Password</Text>
            <Text style={styles.infoValue}>••••••••</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Organizer Profile</Text>
                <Text style={styles.modalSub}>All marked (*) fields are required to unlock customer view</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Form */}
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.formSectionTitle}>ORGANIZER DETAILS</Text>

              <FormInput
                label="Admin Username (Login ID) *"
                placeholder="e.g. admin or organizer_1"
                value={editUsername}
                onChangeText={(val) => {
                  setEditUsername(val);
                  setFormErrors((prev) => ({ ...prev, username: '' }));
                }}
                autoCapitalize="none"
                error={formErrors.username}
              />

              <FormInput
                label="Organizer Full Name *"
                placeholder="e.g. Suraj Kumar"
                value={editName}
                onChangeText={(val) => {
                  setEditName(val);
                  setFormErrors((prev) => ({ ...prev, name: '' }));
                }}
                error={formErrors.name}
              />

              <FormInput
                label="Chit Fund / Agency Name"
                placeholder="e.g. Sri Lakshmi Chit Funds"
                value={editBusinessName}
                onChangeText={(val) => setEditBusinessName(val)}
              />

              <Text style={styles.formSectionTitle}>CONTACT INFORMATION</Text>

              <FormInput
                label="Primary Phone Number (10 Digits) *"
                placeholder="e.g. 9876543210"
                value={editPhone}
                onChangeText={(val) => {
                  setEditPhone(val);
                  setFormErrors((prev) => ({ ...prev, phone: '' }));
                }}
                keyboardType="numeric"
                maxLength={10}
                error={formErrors.phone}
              />

              <FormInput
                label="Official Email Address *"
                placeholder="e.g. suraj@chitflow.com"
                value={editEmail}
                onChangeText={(val) => {
                  setEditEmail(val);
                  setFormErrors((prev) => ({ ...prev, email: '' }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={formErrors.email}
              />

              <Text style={styles.formSectionTitle}>OFFICE ADDRESS</Text>

              <FormInput
                label="Street / Office Address *"
                placeholder="e.g. 104, High Road, T. Nagar"
                value={editAddress}
                onChangeText={(val) => {
                  setEditAddress(val);
                  setFormErrors((prev) => ({ ...prev, address: '' }));
                }}
                error={formErrors.address}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
                  <FormInput
                    label="City / District"
                    placeholder="e.g. Chennai"
                    value={editCity}
                    onChangeText={(val) => {
                      setEditCity(val);
                      setLocationHint(null);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput
                    label="Postal Pincode"
                    placeholder="e.g. 600076"
                    value={editPincode}
                    onChangeText={handlePincodeChange}
                    keyboardType="numeric"
                    maxLength={6}
                    error={formErrors.pincode}
                  />
                </View>
              </View>

              {locationHint ? (
                <View
                  style={[
                    styles.locationHintBox,
                    locationHint.startsWith('✓')
                      ? styles.locationHintSuccess
                      : styles.locationHintLoading,
                  ]}
                >
                  {isFetchingLocation && (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.secondary}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.locationHintText,
                      locationHint.startsWith('✓')
                        ? styles.locationHintSuccessText
                        : styles.locationHintLoadingText,
                    ]}
                  >
                    {locationHint}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.formSectionTitle}>SECURITY & PASSWORD (OPTIONAL)</Text>

              <FormInput
                label="New Password (leave blank to keep unchanged)"
                placeholder="Enter new password (min 6 chars)"
                value={editPassword}
                onChangeText={(val) => {
                  setEditPassword(val);
                  setFormErrors((prev) => ({ ...prev, password: '', confirmPassword: '' }));
                }}
                secureTextEntry={true}
                autoCapitalize="none"
                error={formErrors.password}
              />

              {editPassword.length > 0 && (
                <FormInput
                  label="Confirm New Password *"
                  placeholder="Re-enter new password"
                  value={editConfirmPassword}
                  onChangeText={(val) => {
                    setEditConfirmPassword(val);
                    setFormErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  error={formErrors.confirmPassword}
                />
              )}

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsEditModalVisible(false)}
                  style={{ flex: 1, marginRight: SPACING.sm }}
                />
                <Button
                  title="Save Profile"
                  variant="primary"
                  loading={isSaving}
                  onPress={handleSaveProfile}
                  style={{ flex: 1.5 }}
                />
              </View>
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
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
  },
  backButtonText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 12,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    fontSize: 16,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontSize: 10,
    marginTop: 1,
  },
  headerLogoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
  },
  headerLogoutText: {
    ...TYPOGRAPHY.captionBold,
    color: '#F87171',
    fontSize: 11,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
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
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    ...SHADOWS.sm,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroDetails: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 4,
  },
  roleBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#FBBF24',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  adminNameText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  adminUsernameText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontSize: 11,
    marginTop: 1,
  },
  businessNameText: {
    ...TYPOGRAPHY.captionBold,
    color: '#93C5FD',
    fontSize: 12,
    marginTop: 3,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: SPACING.md,
  },
  editBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    alignItems: 'center',
  },
  editBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.xs + 2,
    marginTop: SPACING.sm,
  },
  sectionEditLink: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  infoValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    fontSize: 13,
  },
  placeholderValue: {
    color: COLORS.textLight,
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniActionBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniActionText: {
    ...TYPOGRAPHY.captionBold,
    color: '#2563EB',
    fontSize: 10,
  },
  scopeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  scopeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scopeCol: {
    flex: 1,
    alignItems: 'center',
  },
  scopeLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  scopeVal: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontSize: 15,
    marginTop: 2,
    fontWeight: '800',
  },
  scopeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  scopeNoteIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 1,
  },
  scopeNoteText: {
    ...TYPOGRAPHY.caption,
    color: '#64748B',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  modalSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  modalScroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  formSectionTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  formRow: {
    flexDirection: 'row',
  },
  locationHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  locationHintSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  locationHintLoading: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  locationHintText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
  },
  locationHintSuccessText: {
    color: '#065F46',
  },
  locationHintLoadingText: {
    color: '#1D4ED8',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    marginBottom: Platform.OS === 'ios' ? 36 : SPACING.xl,
  },
});

export default AdminProfileScreen;

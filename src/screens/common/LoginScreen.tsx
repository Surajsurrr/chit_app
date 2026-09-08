import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { StatusBar } from 'expo-status-bar';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    loginAsAdmin,
    loginAsCustomer,
    registerAdmin,
    isCloudConnected,
    admins,
    customers,
  } = useChitData();

  // Role tab: 'admin' or 'customer' (default: 'customer' or 'admin' - let's default to 'admin')
  const [loginTab, setLoginTab] = useState<'admin' | 'customer'>('admin');
  // Admin authMode: 'signin' or 'signup' (only for admin)
  const [adminAuthMode, setAdminAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [customerIdentifier, setCustomerIdentifier] = useState('');
  const [customerPin, setCustomerPin] = useState('');

  // Sign Up states - Admin only
  const [regAdminUser, setRegAdminUser] = useState('');
  const [regAdminPass, setRegAdminPass] = useState('');
  const [regAdminConfirm, setRegAdminConfirm] = useState('');

  // General state handlers
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Success Feedback Modal & Persistent Banner states for Admin
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    role: 'admin';
    title: string;
    greeting: string;
    message: string;
    details: Array<{ label: string; value: string }>;
    onContinue: () => void;
  } | null>(null);

  const [registrationBanner, setRegistrationBanner] = useState<{
    role: 'admin';
    text: string;
  } | null>(null);

  const resetForm = () => {
    setAdminPassword('');
    setCustomerIdentifier('');
    setCustomerPin('');
    setRegAdminUser('');
    setRegAdminPass('');
    setRegAdminConfirm('');
    setErrors({});
  };

  // Login handler - Admin
  const handleAdminSignIn = async () => {
    setErrors({});
    const newErrors: Record<string, string> = {};
    if (!adminUsername.trim()) newErrors.adminUsername = 'Username is required';
    if (!adminPassword) newErrors.adminPassword = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await loginAsAdmin(adminUsername.trim(), adminPassword);
      setLoading(false);
      if (result.success) {
        resetForm();
      } else {
        setErrors({ login: result.error || 'Authentication failed' });
      }
    } catch (err: any) {
      setLoading(false);
      setErrors({ login: err?.message || 'Authentication failed' });
    }
  };

  // Login handler - Customer (ID or Mobile + 4-digit PIN)
  const handleCustomerSignIn = async () => {
    setErrors({});
    const newErrors: Record<string, string> = {};

    const cleanId = customerIdentifier.trim();
    if (!cleanId) {
      newErrors.customerIdentifier = 'Customer ID or Mobile Number is required';
    } else if (cleanId.length < 3) {
      newErrors.customerIdentifier = 'Please enter a valid Customer ID or Mobile Number';
    }

    if (!customerPin) {
      newErrors.customerPin = '4-digit login PIN is required';
    } else if (!/^\d{4}$/.test(customerPin.trim())) {
      newErrors.customerPin = 'PIN must be exactly 4 digits';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await loginAsCustomer(cleanId, customerPin.trim());
      setLoading(false);
      if (result.success) {
        resetForm();
      } else {
        setErrors({ login: result.error || 'Authentication failed' });
      }
    } catch (err: any) {
      setLoading(false);
      setErrors({ login: err?.message || 'Authentication failed' });
    }
  };

  // Registration handler - Admin only
  const handleAdminSignUp = async () => {
    setErrors({});
    const newErrors: Record<string, string> = {};

    if (!regAdminUser.trim()) newErrors.regAdminUser = 'Username is required';
    if (!regAdminPass) {
      newErrors.regAdminPass = 'Password is required';
    } else if (regAdminPass.length < 6) {
      newErrors.regAdminPass = 'Password must be at least 6 characters';
    }

    if (regAdminPass !== regAdminConfirm) {
      newErrors.regAdminConfirm = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await registerAdmin(regAdminUser.trim(), regAdminPass);
      setLoading(false);
      if (result.success) {
        const registeredUser = regAdminUser.trim();
        const registeredPass = regAdminPass;
        resetForm();

        const proceedToSignIn = () => {
          setSuccessModal(null);
          setAdminAuthMode('signin');
          setLoginTab('admin');
          setAdminUsername(registeredUser);
          setAdminPassword(registeredPass);
          setRegistrationBanner({
            role: 'admin',
            text: `Organizer account "${registeredUser}" registered successfully! Please click "Sign In as Organizer" below.`,
          });
        };

        setSuccessModal({
          visible: true,
          role: 'admin',
          title: 'Successfully Registered! 🎉',
          greeting: `Welcome, ${registeredUser}!`,
          message:
            'Your Chit Organizer (Admin) account has been registered in the centralized cloud database. You can now sign in with your credentials on any device to manage customers, lending terms, and collections.',
          details: [
            { label: 'Role', value: 'Chit Organizer (Admin)' },
            { label: 'Username', value: registeredUser },
            { label: 'Cloud Sync', value: 'Centralized Database' },
            { label: 'Status', value: 'Active & Ready' },
          ],
          onContinue: proceedToSignIn,
        });
      } else {
        setErrors({ registration: result.error || 'Failed to create admin' });
      }
    } catch (err: any) {
      setLoading(false);
      setErrors({ registration: err?.message || 'Registration failed' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Logo Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>CF</Text>
            </View>
            <Text style={styles.brandName}>ChitFlow</Text>
            <Text style={styles.brandSub}>Direct Lending & Ledger Management</Text>
            <View style={styles.cloudBadge}>
              <View style={[styles.cloudDot, { backgroundColor: isCloudConnected ? '#10B981' : '#F59E0B' }]} />
              <Text style={styles.cloudBadgeText}>
                {isCloudConnected ? '☁️ Central Cloud Sync Online' : '💾 Local Storage Mode'}
              </Text>
            </View>
          </View>

          {/* Portal Switcher (Admin vs Customer) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, loginTab === 'admin' ? styles.tabBtnActive : null]}
              onPress={() => {
                setLoginTab('admin');
                setErrors({});
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, loginTab === 'admin' ? styles.tabTextActive : null]}>
                🏢 Organizer (Admin)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, loginTab === 'customer' ? styles.tabBtnActive : null]}
              onPress={() => {
                setLoginTab('customer');
                setAdminAuthMode('signin');
                setErrors({});
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, loginTab === 'customer' ? styles.tabTextActive : null]}>
                👤 Member (Customer)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Admin Sub-tabs: Sign In vs Register Admin */}
          {loginTab === 'admin' && (
            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[styles.modeBtn, adminAuthMode === 'signin' ? styles.modeBtnActive : null]}
                onPress={() => {
                  setAdminAuthMode('signin');
                  resetForm();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeText, adminAuthMode === 'signin' ? styles.modeTextActive : null]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeBtn, adminAuthMode === 'signup' ? styles.modeBtnActive : null]}
                onPress={() => {
                  setAdminAuthMode('signup');
                  resetForm();
                  setRegistrationBanner(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeText, adminAuthMode === 'signup' ? styles.modeTextActive : null]}>
                  Register Admin Account
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Credentials Card Form */}
          <Card style={styles.loginCard} padding={SPACING.lg}>
            {/* Friendly Registration Success Banner */}
            {registrationBanner && loginTab === 'admin' && adminAuthMode === 'signin' ? (
              <View style={styles.successBanner}>
                <View style={styles.successBannerIconBox}>
                  <Text style={styles.successBannerEmoji}>🎉</Text>
                </View>
                <View style={{ flex: 1, marginHorizontal: SPACING.xs }}>
                  <Text style={styles.successBannerTitle}>Successfully Registered!</Text>
                  <Text style={styles.successBannerText}>{registrationBanner.text}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setRegistrationBanner(null)}
                  style={styles.bannerDismissBtn}
                  accessibilityLabel="Dismiss message"
                >
                  <Text style={styles.bannerDismissText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {errors.login ? <Text style={styles.errorBanner}>{errors.login}</Text> : null}
            {errors.registration ? <Text style={styles.errorBanner}>{errors.registration}</Text> : null}

            {/* ==================== ADMIN FORMS ==================== */}
            {loginTab === 'admin' && adminAuthMode === 'signin' && (
              <View>
                <Text style={styles.formTitle}>Organizer Portal</Text>
                <Text style={styles.formSub}>Log in to manage customer ledgers, payouts & collections</Text>

                {admins.length === 0 && (
                  <View style={styles.cleanSlateBanner}>
                    <Text style={styles.cleanSlateIcon}>ℹ️</Text>
                    <View style={{ flex: 1, marginLeft: SPACING.xs }}>
                      <Text style={styles.cleanSlateTitle}>No Admin Registered Yet</Text>
                      <Text style={styles.cleanSlateText}>
                        Click "Register Admin Account" above to create your organizer credentials.
                      </Text>
                    </View>
                  </View>
                )}

                <FormInput
                  label="Username"
                  placeholder="Enter admin username"
                  value={adminUsername}
                  onChangeText={(val) => {
                    setAdminUsername(val);
                    setErrors({});
                  }}
                  autoCapitalize="none"
                  error={errors.adminUsername}
                />

                <FormInput
                  label="Password"
                  placeholder="Enter password"
                  value={adminPassword}
                  onChangeText={(val) => {
                    setAdminPassword(val);
                    setErrors({});
                  }}
                  secureTextEntry={true}
                  error={errors.adminPassword}
                  autoCapitalize="none"
                />

                <Button
                  title="Sign In as Organizer"
                  onPress={handleAdminSignIn}
                  loading={loading}
                  style={styles.submitBtn}
                  size="large"
                />
              </View>
            )}

            {loginTab === 'admin' && adminAuthMode === 'signup' && (
              <View>
                <Text style={styles.formTitle}>Create Admin Account</Text>
                <Text style={styles.formSub}>Register credentials for a new chit organizer</Text>

                <FormInput
                  label="Choose Username"
                  placeholder="e.g. manager1"
                  value={regAdminUser}
                  onChangeText={(val) => {
                    setRegAdminUser(val);
                    setErrors({});
                  }}
                  autoCapitalize="none"
                  error={errors.regAdminUser}
                />

                <FormInput
                  label="Password (min 6 characters)"
                  placeholder="Create secure password"
                  value={regAdminPass}
                  onChangeText={(val) => {
                    setRegAdminPass(val);
                    setErrors({});
                  }}
                  secureTextEntry={true}
                  error={errors.regAdminPass}
                  autoCapitalize="none"
                />

                <FormInput
                  label="Confirm Password"
                  placeholder="Confirm password"
                  value={regAdminConfirm}
                  onChangeText={(val) => {
                    setRegAdminConfirm(val);
                    setErrors({});
                  }}
                  secureTextEntry={true}
                  error={errors.regAdminConfirm}
                  autoCapitalize="none"
                />

                <Button
                  title="Register Admin Account"
                  onPress={handleAdminSignUp}
                  loading={loading}
                  style={styles.submitBtn}
                  size="large"
                />
              </View>
            )}

            {/* ==================== CUSTOMER FORM (SIGN IN ONLY) ==================== */}
            {loginTab === 'customer' && (
              <View>
                <View style={styles.memberHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formTitle}>Member Portal</Text>
                    <Text style={styles.formSub}>Sign in with your Customer ID or Mobile Number</Text>
                  </View>
                  <View style={styles.customerPill}>
                    <Text style={styles.customerPillText}>CUSTOMER</Text>
                  </View>
                </View>

                {customers.length === 0 && (
                  <View style={styles.cleanSlateBanner}>
                    <Text style={styles.cleanSlateIcon}>ℹ️</Text>
                    <View style={{ flex: 1, marginLeft: SPACING.xs }}>
                      <Text style={styles.cleanSlateTitle}>No Customers Added Yet</Text>
                      <Text style={styles.cleanSlateText}>
                        Customer accounts are created and activated by the Admin in the Organizer Portal.
                      </Text>
                    </View>
                  </View>
                )}

                <FormInput
                  label="Customer ID or Mobile Number"
                  placeholder="e.g. CUST-101 or 0987654321"
                  value={customerIdentifier}
                  onChangeText={(val) => {
                    setCustomerIdentifier(val);
                    setErrors({});
                  }}
                  autoCapitalize="characters"
                  error={errors.customerIdentifier}
                />

                <FormInput
                  label="4-Digit Login PIN"
                  placeholder="Enter 4-digit PIN (e.g. 1234)"
                  value={customerPin}
                  onChangeText={(val) => {
                    setCustomerPin(val);
                    setErrors({});
                  }}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry={true}
                  error={errors.customerPin}
                />

                <Button
                  title="Sign In as Member"
                  onPress={handleCustomerSignIn}
                  loading={loading}
                  style={styles.submitBtn}
                  size="large"
                  variant="success"
                />

                {/* Clear informational card for customers */}
                <View style={styles.memberInfoCallout}>
                  <Text style={styles.memberInfoIcon}>💡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberInfoTitle}>Direct Lending Enrollment</Text>
                    <Text style={styles.memberInfoText}>
                      Customers do not need to register. Your Customer ID, 4-digit PIN, and lending terms are activated directly by the organizer. Sign in with the credentials provided to you.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
          
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Admin Registration Success Celebration Modal */}
      {successModal && (
        <Modal
          visible={successModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={successModal.onContinue}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.successCard}>
              <View style={styles.successBadgeOuter}>
                <View style={styles.successBadgeInner}>
                  <Text style={styles.successBadgeEmoji}>🎉</Text>
                </View>
              </View>

              <Text style={styles.successModalTitle}>{successModal.title}</Text>
              <Text style={styles.successModalGreeting}>{successModal.greeting}</Text>
              <Text style={styles.successModalMessage}>{successModal.message}</Text>

              <View style={styles.detailsContainer}>
                {successModal.details.map((item, index) => (
                  <View
                    key={item.label}
                    style={[
                      styles.detailRow,
                      index < successModal.details.length - 1 ? styles.detailRowBorder : null,
                    ]}
                  >
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={styles.detailValue}>{item.value}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.successActionButton}
                onPress={successModal.onContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.successActionButtonText}>Sign In Now →</Text>
              </TouchableOpacity>

              <Text style={styles.successFooterNote}>
                Credentials synced to centralized cloud database
              </Text>
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
  scrollContent: {
    padding: SPACING.lg,
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  logoText: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    fontWeight: '800',
  },
  brandName: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  brandSub: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: SPACING.xs + 2,
  },
  cloudDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  cloudBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.sm + 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 3,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  tabText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.md,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: COLORS.secondary,
    ...SHADOWS.sm,
  },
  modeText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.textLight,
    fontSize: 13,
  },
  modeTextActive: {
    color: COLORS.white,
  },
  loginCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customerPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: SPACING.xs,
  },
  customerPillText: {
    ...TYPOGRAPHY.captionBold,
    color: '#15803D',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  formTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  formSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  submitBtn: {
    marginTop: SPACING.md,
  },
  errorBanner: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger,
    backgroundColor: COLORS.dangerLight,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  cleanSlateBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
    alignItems: 'flex-start',
  },
  cleanSlateIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
    marginTop: 1,
  },
  cleanSlateTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#0369A1',
    fontSize: 12,
  },
  cleanSlateText: {
    ...TYPOGRAPHY.caption,
    color: '#0284C7',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  memberInfoCallout: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: SPACING.sm + 2,
    marginTop: SPACING.lg,
    alignItems: 'flex-start',
  },
  memberInfoIcon: {
    fontSize: 16,
    marginRight: SPACING.xs + 2,
    marginTop: 1,
  },
  memberInfoTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    fontSize: 12,
  },
  memberInfoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  // Success Banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
  },
  successBannerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  successBannerEmoji: {
    fontSize: 16,
  },
  successBannerTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#065F46',
    fontSize: 13,
  },
  successBannerText: {
    ...TYPOGRAPHY.caption,
    color: '#047857',
    marginTop: 1,
    lineHeight: 16,
    fontSize: 12,
  },
  bannerDismissBtn: {
    padding: 6,
    marginLeft: 4,
  },
  bannerDismissText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '700',
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
  successActionButton: {
    width: '100%',
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  successActionButtonText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  successFooterNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.sm + 2,
    textAlign: 'center',
  },
});

export default LoginScreen;

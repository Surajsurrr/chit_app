import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
    registerCustomer,
    isCloudConnected,
    admins,
    customers,
  } = useChitData();

  // Mode tabs: 'signin' or 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  // Role tabs: 'admin' or 'customer'
  const [loginTab, setLoginTab] = useState<'admin' | 'customer'>('admin');

  // Sign In states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPin, setCustomerPin] = useState('');

  // Sign Up states - Admin
  const [regAdminUser, setRegAdminUser] = useState('');
  const [regAdminPass, setRegAdminPass] = useState('');
  const [regAdminConfirm, setRegAdminConfirm] = useState('');

  // Sign Up states - Customer
  const [regCustName, setRegCustName] = useState('');
  const [regCustPhone, setRegCustPhone] = useState('');
  const [regCustPin, setRegCustPin] = useState('');
  const [regCustConfirm, setRegCustConfirm] = useState('');

  // General state handlers
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Success Feedback Modal & Persistent Banner states
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    role: 'admin' | 'customer';
    title: string;
    greeting: string;
    message: string;
    details: Array<{ label: string; value: string }>;
    onContinue: () => void;
  } | null>(null);

  const [registrationBanner, setRegistrationBanner] = useState<{
    role: 'admin' | 'customer';
    text: string;
  } | null>(null);

  const resetForm = () => {
    setAdminPassword('');
    setCustomerPhone('');
    setCustomerPin('');
    setRegAdminUser('');
    setRegAdminPass('');
    setRegAdminConfirm('');
    setRegCustName('');
    setRegCustPhone('');
    setRegCustPin('');
    setRegCustConfirm('');
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

  // Login handler - Customer
  const handleCustomerSignIn = async () => {
    setErrors({});
    const newErrors: Record<string, string> = {};

    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(customerPhone.trim())) {
      newErrors.customerPhone = 'Enter a valid 10-digit number';
    }

    if (!customerPin) {
      newErrors.customerPin = 'PIN is required';
    } else if (!/^\d{4}$/.test(customerPin)) {
      newErrors.customerPin = 'PIN must be 4 digits';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await loginAsCustomer(customerPhone.trim(), customerPin);
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

  // Registration handler - Admin
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
          setAuthMode('signin');
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
            'Your Chit Organizer (Admin) account has been registered in the centralized cloud database. You can now sign in with your credentials on any device (iPhone, Android, web) to manage chit schemes and payments.',
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

  // Registration handler - Customer
  const handleCustomerSignUp = async () => {
    setErrors({});
    const newErrors: Record<string, string> = {};

    if (!regCustName.trim()) newErrors.regCustName = 'Full Name is required';
    if (!regCustPhone.trim()) {
      newErrors.regCustPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(regCustPhone.trim())) {
      newErrors.regCustPhone = 'Phone must be exactly 10 digits';
    }

    if (!regCustPin) {
      newErrors.regCustPin = 'PIN is required';
    } else if (!/^\d{4}$/.test(regCustPin)) {
      newErrors.regCustPin = 'PIN must be exactly 4 digits';
    }

    if (regCustPin !== regCustConfirm) {
      newErrors.regCustConfirm = 'PINs do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await registerCustomer(
        regCustName.trim(),
        regCustPhone.trim(),
        regCustPin
      );
      setLoading(false);
      if (result.success) {
        const registeredName = regCustName.trim();
        const registeredPhone = regCustPhone.trim();
        const registeredPin = regCustPin;
        resetForm();

        const proceedToSignIn = () => {
          setSuccessModal(null);
          setAuthMode('signin');
          setLoginTab('customer');
          setCustomerPhone(registeredPhone);
          setCustomerPin(registeredPin);
          setRegistrationBanner({
            role: 'customer',
            text: `Member account for "${registeredName}" registered successfully! Please click "Sign In as Member" below.`,
          });
        };

        setSuccessModal({
          visible: true,
          role: 'customer',
          title: 'Successfully Registered! 🎉',
          greeting: `Welcome, ${registeredName}!`,
          message:
            'Your Member account has been registered in the centralized cloud database. You can now sign in using your registered mobile number and 4-digit PIN from any device to track chit schemes and download payment receipts.',
          details: [
            { label: 'Role', value: 'Chit Member (Customer)' },
            { label: 'Member Name', value: registeredName },
            { label: 'Phone Number', value: registeredPhone },
            { label: 'Cloud Sync', value: 'Centralized Database' },
            { label: 'Status', value: 'Active & Ready' },
          ],
          onContinue: proceedToSignIn,
        });
      } else {
        setErrors({ registration: result.error || 'Failed to register customer' });
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
            <Text style={styles.brandSub}>Secure Recurring Payment System</Text>
            <View style={styles.cloudBadge}>
              <View style={[styles.cloudDot, { backgroundColor: isCloudConnected ? '#10B981' : '#F59E0B' }]} />
              <Text style={styles.cloudBadgeText}>
                {isCloudConnected ? '☁️ Central Cloud Sync Online' : '💾 Local Storage Mode'}
              </Text>
            </View>
          </View>

          {/* Mode Switcher (Sign In vs Sign Up) */}
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[styles.modeBtn, authMode === 'signin' ? styles.modeBtnActive : null]}
              onPress={() => {
                setAuthMode('signin');
                resetForm();
              }}
            >
              <Text style={[styles.modeText, authMode === 'signin' ? styles.modeTextActive : null]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, authMode === 'signup' ? styles.modeBtnActive : null]}
              onPress={() => {
                setAuthMode('signup');
                resetForm();
                setRegistrationBanner(null);
              }}
            >
              <Text style={[styles.modeText, authMode === 'signup' ? styles.modeTextActive : null]}>
                Sign Up / Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* Portal Switcher (Admin vs Customer) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, loginTab === 'admin' ? styles.tabBtnActive : null]}
              onPress={() => {
                setLoginTab('admin');
                setErrors({});
              }}
            >
              <Text style={[styles.tabText, loginTab === 'admin' ? styles.tabTextActive : null]}>
                Organizer (Admin)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, loginTab === 'customer' ? styles.tabBtnActive : null]}
              onPress={() => {
                setLoginTab('customer');
                setErrors({});
              }}
            >
              <Text style={[styles.tabText, loginTab === 'customer' ? styles.tabTextActive : null]}>
                Member (Customer)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Credentials Card Form */}
          <Card style={styles.loginCard} padding={SPACING.lg}>
            {/* Friendly Registration Success Banner */}
            {registrationBanner && authMode === 'signin' ? (
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

            {authMode === 'signin' ? (
              // ==================== SIGN IN FORMS ====================
              loginTab === 'admin' ? (
                // Admin Sign In
                <View>
                  <Text style={styles.formTitle}>Admin Portal</Text>
                  <Text style={styles.formSub}>Log in to manage collections and members</Text>

                  {admins.length === 0 && (
                    <View style={styles.cleanSlateBanner}>
                      <Text style={styles.cleanSlateIcon}>ℹ️</Text>
                      <View style={{ flex: 1, marginLeft: SPACING.xs }}>
                        <Text style={styles.cleanSlateTitle}>No Admin Registered Yet</Text>
                        <Text style={styles.cleanSlateText}>
                          Switch to the "Sign Up / Register" tab above to create your first Admin account.
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
                    title="Sign In as Admin"
                    onPress={handleAdminSignIn}
                    loading={loading}
                    style={styles.submitBtn}
                    size="large"
                  />
                </View>
              ) : (
                // Customer Sign In
                <View>
                  <Text style={styles.formTitle}>Member Portal</Text>
                  <Text style={styles.formSub}>Log in to view balance and pay installments</Text>

                  {customers.length === 0 && (
                    <View style={styles.cleanSlateBanner}>
                      <Text style={styles.cleanSlateIcon}>ℹ️</Text>
                      <View style={{ flex: 1, marginLeft: SPACING.xs }}>
                        <Text style={styles.cleanSlateTitle}>No Members Registered Yet</Text>
                        <Text style={styles.cleanSlateText}>
                          Members can self-register via "Sign Up / Register" above or be registered by the Admin in the organizer portal.
                        </Text>
                      </View>
                    </View>
                  )}

                  <FormInput
                    label="Registered Phone Number"
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChangeText={(val) => {
                      setCustomerPhone(val);
                      setErrors({});
                    }}
                    keyboardType="numeric"
                    maxLength={10}
                    error={errors.customerPhone}
                  />

                  <FormInput
                    label="4-Digit Account PIN"
                    placeholder="Enter PIN"
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
                </View>
              )
            ) : (
              // ==================== SIGN UP FORMS ====================
              loginTab === 'admin' ? (
                // Admin Sign Up (Registration)
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
              ) : (
                // Customer Sign Up (Registration)
                <View>
                  <Text style={styles.formTitle}>Register Member Account</Text>
                  <Text style={styles.formSub}>Create a profile to access your chit records</Text>

                  <FormInput
                    label="Full Name"
                    placeholder="e.g. Ravi Kumar"
                    value={regCustName}
                    onChangeText={(val) => {
                      setRegCustName(val);
                      setErrors({});
                    }}
                    error={errors.regCustName}
                  />

                  <FormInput
                    label="Phone Number"
                    placeholder="e.g. 9999988888"
                    value={regCustPhone}
                    onChangeText={(val) => {
                      setRegCustPhone(val);
                      setErrors({});
                    }}
                    keyboardType="numeric"
                    maxLength={10}
                    error={errors.regCustPhone}
                  />

                  <FormInput
                    label="Set 4-Digit Login PIN"
                    placeholder="e.g. 1234"
                    value={regCustPin}
                    onChangeText={(val) => {
                      setRegCustPin(val);
                      setErrors({});
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry={true}
                    error={errors.regCustPin}
                  />

                  <FormInput
                    label="Confirm 4-Digit PIN"
                    placeholder="Confirm PIN"
                    value={regCustConfirm}
                    onChangeText={(val) => {
                      setRegCustConfirm(val);
                      setErrors({});
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry={true}
                    error={errors.regCustConfirm}
                  />

                  <Button
                    title="Register Member Account"
                    onPress={handleCustomerSignUp}
                    loading={loading}
                    style={styles.submitBtn}
                    size="large"
                    variant="success"
                  />
                </View>
              )
            )}
          </Card>
          
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Registration Success Celebration Modal */}
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
                {successModal.details.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.detailRow,
                      idx < successModal.details.length - 1 ? styles.detailRowBorder : null,
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
                activeOpacity={0.85}
              >
                <Text style={styles.successActionButtonText}>
                  {successModal.role === 'admin'
                    ? 'Sign In as Organizer →'
                    : 'Sign In as Member →'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.successFooterNote}>
                💡 Your credentials have been pre-filled for easy sign in.
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
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  logoText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
  },
  brandName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    letterSpacing: 1,
  },
  brandSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 2,
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
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
  },
  modeTextActive: {
    color: COLORS.white,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
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
  loginCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  hintText: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },
  // Scheme Selector styles for self-registration
  schemeSectionLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryLight,
    marginBottom: SPACING.xs + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  schemeSelectContainer: {
    marginBottom: SPACING.md,
  },
  schemeCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md - 2,
    marginBottom: SPACING.sm,
  },
  schemeCardSelected: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successLight,
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
    color: COLORS.success,
  },
  schemeSubSelected: {
    color: COLORS.success,
    opacity: 0.8,
  },
  schemeErrorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    marginBottom: SPACING.sm,
    marginTop: -SPACING.xs,
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

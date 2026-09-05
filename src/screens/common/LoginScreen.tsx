import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { StatusBar } from 'expo-status-bar';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { loginAsAdmin, loginAsCustomer, registerAdmin, registerCustomer, admins, customers, schemes } = useChitData();

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
  const handleAdminSignIn = () => {
    setErrors({});
    const newErrors: Record<string, string> = {};
    if (!adminUsername.trim()) newErrors.adminUsername = 'Username is required';
    if (!adminPassword) newErrors.adminPassword = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const result = loginAsAdmin(adminUsername.trim(), adminPassword);
      setLoading(false);
      if (result.success) {
        resetForm();
      } else {
        setErrors({ login: result.error || 'Authentication failed' });
      }
    }, 200);
  };

  // Login handler - Customer
  const handleCustomerSignIn = () => {
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
    setTimeout(() => {
      const result = loginAsCustomer(customerPhone.trim(), customerPin);
      setLoading(false);
      if (result.success) {
        resetForm();
      } else {
        setErrors({ login: result.error || 'Authentication failed' });
      }
    }, 200);
  };

  // Registration handler - Admin
  const handleAdminSignUp = () => {
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
    setTimeout(() => {
      const result = registerAdmin(regAdminUser.trim(), regAdminPass);
      setLoading(false);
      if (result.success) {
        const registeredUser = regAdminUser.trim();
        const registeredPass = regAdminPass;
        resetForm();
        Alert.alert(
          'Admin Registered! 🎉',
          `Organizer account "${registeredUser}" was created successfully. You can now sign in with your credentials.`,
          [
            {
              text: 'Sign In Now',
              onPress: () => {
                setAuthMode('signin');
                setLoginTab('admin');
                setAdminUsername(registeredUser);
                setAdminPassword(registeredPass);
              },
            },
          ]
        );
      } else {
        setErrors({ registration: result.error || 'Failed to create admin' });
      }
    }, 400);
  };

  // Registration handler - Customer
  const handleCustomerSignUp = () => {
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
    setTimeout(() => {
      const result = registerCustomer(
        regCustName.trim(),
        regCustPhone.trim(),
        regCustPin
      );
      setLoading(false);
      if (result.success) {
        const registeredPhone = regCustPhone.trim();
        const registeredPin = regCustPin;
        resetForm();
        Alert.alert(
          'Member Registered! 🎉',
          `Member account for "${regCustName.trim()}" was created successfully. You can now sign in using your phone and PIN.`,
          [
            {
              text: 'Sign In Now',
              onPress: () => {
                setAuthMode('signin');
                setLoginTab('customer');
                setCustomerPhone(registeredPhone);
                setCustomerPin(registeredPin);
              },
            },
          ]
        );
      } else {
        setErrors({ registration: result.error || 'Failed to register customer' });
      }
    }, 400);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
});

export default LoginScreen;

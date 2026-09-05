import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Customer,
  Payment,
  Scheme,
  Receipt,
  EnrolledScheme,
  INITIAL_CUSTOMERS,
  INITIAL_PAYMENTS,
  INITIAL_RECEIPTS,
  INITIAL_SCHEMES,
} from '../data/mockData';
import { calculateNextPaymentDate } from '../utils/dateHelpers';

export type UserRole = 'admin' | 'customer';

export interface AdminCredentials {
  username: string;
  password: string;
  name?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
}

export const isAdminProfileComplete = (admin?: AdminCredentials | null): boolean => {
  if (!admin) return false;
  return Boolean(
    admin.name && admin.name.trim().length > 0 &&
    admin.phone && admin.phone.trim().replace(/[^0-9]/g, '').length === 10 &&
    admin.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim()) &&
    admin.address && admin.address.trim().length > 0
  );
};

export const isCustomerProfileComplete = (customer?: Customer | null): boolean => {
  if (!customer) return false;
  return Boolean(
    customer.name && customer.name.trim().length > 0 &&
    customer.phone && customer.phone.trim().replace(/[^0-9]/g, '').length === 10 &&
    customer.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()) &&
    customer.address && customer.address.trim().length > 0
  );
};

interface AdminStats {
  totalCustomers: number;
  totalGiven: number;
  totalCollected: number;
  outstandingAmount: number;
  collectionProgress: number; // percentage
}

interface CustomerStats {
  paidAmount: number;
  remainingAmount: number;
  totalPayments: number;
  progressPercentage: number;
}

interface ChitDataContextType {
  currentRole: UserRole;
  selectedCustomerId: string;
  customers: Customer[];
  payments: Payment[];
  schemes: Scheme[];
  receipts: Receipt[];
  isLoading: boolean;
  
  // Authentication properties
  isLoggedIn: boolean;
  currentUserRole: UserRole | null;
  currentUserId: string | null;
  admins: AdminCredentials[];
  currentAdmin: AdminCredentials | null;
  isAdminProfileComplete: boolean;
  isCustomerProfileComplete: (customerId?: string) => boolean;
  isCurrentCustomerProfileComplete: boolean;
  
  // Actions
  switchRole: (role: UserRole) => void;
  selectCustomer: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'nextPaymentDate'>) => void;
  addScheme: (scheme: Omit<Scheme, 'id' | 'startDate' | 'status'>) => void;
  updateScheme: (
    schemeId: string,
    updatedScheme: Partial<Omit<Scheme, 'id' | 'startDate' | 'status'>>
  ) => void;
  updateCustomerScheme: (
    customerId: string,
    schemeId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateCustomerProfile: (
    customerId: string,
    updatedData: Partial<Customer>
  ) => Promise<{ success: boolean; error?: string }>;
  updateAdminProfile: (
    updatedData: Partial<AdminCredentials>
  ) => Promise<{ success: boolean; error?: string }>;
  recordPayment: (
    customerId: string,
    amount: number,
    method: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer'
  ) => { success: boolean; error?: string; receipt?: Receipt };
  resetData: () => Promise<void>;
  
  // Auth & Registration methods
  loginAsAdmin: (username: string, password: string) => { success: boolean; error?: string };
  loginAsCustomer: (phone: string, pin: string) => { success: boolean; error?: string };
  logout: () => void;
  registerAdmin: (username: string, password: string) => { success: boolean; error?: string };
  registerCustomer: (
    name: string,
    phone: string,
    pin: string,
    schemeId?: string
  ) => { success: boolean; error?: string };
  
  // Derived state helper methods
  getCustomerStats: (customerId: string) => CustomerStats;
  getAdminStats: () => AdminStats;
}

const ChitDataContext = createContext<ChitDataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROLE: '@chitflow:role',
  SELECTED_CUST: '@chitflow:selected_cust',
  CUSTOMERS: '@chitflow:customers',
  PAYMENTS: '@chitflow:payments',
  SCHEMES: '@chitflow:schemes',
  RECEIPTS: '@chitflow:receipts',
  IS_LOGGED_IN: '@chitflow:is_logged_in',
  CURRENT_USER_ID: '@chitflow:current_user_id',
  CURRENT_ADMIN_USER: '@chitflow:current_admin_user',
  ADMINS: '@chitflow:admins',
};

const DEFAULT_ADMINS: AdminCredentials[] = [];
const CLEAN_SLATE_KEY = '@chitflow:clean_slate_reset_v5';

export const ChitDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>('admin');
  const [selectedCustomerId, setSelectedCustomerIdState] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentAdminUser, setCurrentAdminUser] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminCredentials[]>([]);

  // Load data from storage on startup
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const isCleanReset = await AsyncStorage.getItem(CLEAN_SLATE_KEY);
        if (isCleanReset !== 'true') {
          // Clear any old mock data from previous sessions completely
          await AsyncStorage.clear();
          await AsyncStorage.setItem(CLEAN_SLATE_KEY, 'true');
          await initializeData();
          return;
        }

        const savedRole = await AsyncStorage.getItem(STORAGE_KEYS.ROLE);
        const savedSelectedCust = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CUST);
        const savedCustomers = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        const savedPayments = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
        const savedSchemes = await AsyncStorage.getItem(STORAGE_KEYS.SCHEMES);
        const savedReceipts = await AsyncStorage.getItem(STORAGE_KEYS.RECEIPTS);
        const savedIsLoggedIn = await AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
        const savedCurrentUserId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
        const savedCurrentAdminUser = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN_USER);
        const savedAdmins = await AsyncStorage.getItem(STORAGE_KEYS.ADMINS);

        if (savedRole) {
          setCurrentRoleState(savedRole as UserRole);
          setCurrentUserRole(savedRole as UserRole);
        }
        if (savedSelectedCust) setSelectedCustomerIdState(savedSelectedCust);
        if (savedIsLoggedIn === 'true') setIsLoggedIn(true);
        if (savedCurrentUserId) setCurrentUserId(savedCurrentUserId);
        if (savedCurrentAdminUser) setCurrentAdminUser(savedCurrentAdminUser);

        // Load admins (empty by default if none registered yet)
        if (savedAdmins) {
          try {
            const parsed: AdminCredentials[] = JSON.parse(savedAdmins);
            setAdmins(parsed);
          } catch {
            setAdmins([]);
          }
        } else {
          setAdmins([]);
        }

        if (savedCustomers && savedPayments && savedSchemes && savedReceipts) {
          const parsedCustomers: Customer[] = JSON.parse(savedCustomers);
          const parsedPayments: Payment[] = JSON.parse(savedPayments);
          const parsedReceipts: Receipt[] = JSON.parse(savedReceipts);
          const parsedSchemes: Scheme[] = JSON.parse(savedSchemes);

          // Business Rule: A newly registered customer who has not completed profile setup
          // and has 0 payments should NOT have a default scheme auto-assigned.
          const sanitizedCustomers = parsedCustomers.map((c) => {
            const hasPayments = parsedPayments.some((p) => p.customerId === c.id);
            const isProfileDone = Boolean(c.email && c.email.trim() && c.address && c.address.trim());
            if (!hasPayments && !isProfileDone && c.schemeId === 'scheme-1') {
              return {
                ...c,
                schemeId: '',
                amountGiven: 0,
                collectionAmount: 0,
                enrolledSchemeIds: [],
                enrolledSchemes: [],
              };
            }
            return c;
          });

          setCustomers(sanitizedCustomers);
          setPayments(parsedPayments);
          setSchemes(parsedSchemes);
          setReceipts(parsedReceipts);
        } else {
          // No saved data, initialize clean slate
          await initializeData();
        }
      } catch (error) {
        console.error('Error loading local data:', error);
        await initializeData();
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, []);

  const initializeData = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
      await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEMES, JSON.stringify(INITIAL_SCHEMES));
      await AsyncStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(INITIAL_RECEIPTS));
      await AsyncStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(DEFAULT_ADMINS));
      await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false');
      await AsyncStorage.removeItem(STORAGE_KEYS.ROLE);
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_CUST);
      
      setCustomers(INITIAL_CUSTOMERS);
      setPayments(INITIAL_PAYMENTS);
      setSchemes(INITIAL_SCHEMES);
      setReceipts(INITIAL_RECEIPTS);
      setAdmins(DEFAULT_ADMINS);
      setIsLoggedIn(false);
      setCurrentUserRole(null);
      setCurrentUserId(null);
      setSelectedCustomerIdState('');
    } catch (e) {
      console.error('Failed to initialize clean slate storage data', e);
    }
  };

  const resetData = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.clear();
      await AsyncStorage.setItem(CLEAN_SLATE_KEY, 'true');
      await initializeData();
      setCurrentRoleState('admin');
      setSelectedCustomerIdState('');
      setIsLoggedIn(false);
      setCurrentUserRole(null);
      setCurrentUserId(null);
    } catch (e) {
      console.error('Error resetting data context', e);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (role: UserRole) => {
    setCurrentRoleState(role);
    setCurrentUserRole(role);
    setIsLoggedIn(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ROLE, role);
      await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    } catch (e) {
      console.error(e);
    }
  };

  const selectCustomer = async (id: string) => {
    setSelectedCustomerIdState(id);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CUST, id);
    } catch (e) {
      console.error(e);
    }
  };

  const addCustomer = async (newCustomerData: Omit<Customer, 'id' | 'nextPaymentDate'>) => {
    const newId = `cust-${Date.now()}`;
    const hasScheme = Boolean(newCustomerData.schemeId && newCustomerData.schemeId.trim() !== '');
    const scheme = hasScheme ? schemes.find((s) => s.id === newCustomerData.schemeId) : null;
    const interest = scheme?.interestAmount ?? 0;
    const payout = scheme?.payoutAmount ?? Math.max(0, newCustomerData.amountGiven - interest);

    const enrolledSnapshot: EnrolledScheme | null = (hasScheme && scheme) ? {
      schemeId: newCustomerData.schemeId,
      schemeName: scheme.name,
      totalAmount: newCustomerData.amountGiven,
      interestAmount: interest,
      payoutAmount: payout,
      collectionAmount: newCustomerData.collectionAmount,
      frequency: newCustomerData.frequency,
      durationWeeksOrMonths: scheme.durationWeeksOrMonths || 10,
      enrolledAt: new Date().toISOString(),
    } : null;

    const newCustomer: Customer = {
      ...newCustomerData,
      id: newId,
      schemeId: hasScheme ? newCustomerData.schemeId : '',
      amountGiven: hasScheme ? newCustomerData.amountGiven : 0,
      collectionAmount: hasScheme ? newCustomerData.collectionAmount : 0,
      // For a new customer, next payment date is initial startDate
      nextPaymentDate: newCustomerData.startDate,
      enrolledSchemeIds: enrolledSnapshot ? [newCustomerData.schemeId] : [],
      enrolledSchemes: enrolledSnapshot ? [enrolledSnapshot] : [],
    };

    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const addScheme = async (newSchemeData: Omit<Scheme, 'id' | 'startDate' | 'status'>) => {
    const newId = `scheme-${Date.now()}`;
    const newScheme: Scheme = {
      ...newSchemeData,
      id: newId,
      startDate: new Date().toISOString(),
      status: 'active',
    };

    const updated = [...schemes, newScheme];
    setSchemes(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEMES, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const updateScheme = async (
    schemeId: string,
    updatedScheme: Partial<Omit<Scheme, 'id' | 'startDate' | 'status'>>
  ) => {
    const updatedSchemes = schemes.map((s) => {
      if (s.id === schemeId) {
        return { ...s, ...updatedScheme };
      }
      return s;
    });

    // BUSINESS RULE: Scheme edits ONLY affect future enrollments/availments.
    // Existing enrolled customers retain their locked-in contract terms permanently.
    setSchemes(updatedSchemes);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEMES, JSON.stringify(updatedSchemes));
    } catch (e) {
      console.error('Failed to save updated scheme', e);
    }
  };

  const updateCustomerProfile = async (
    customerId: string,
    updatedData: Partial<Customer>
  ): Promise<{ success: boolean; error?: string }> => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    const updatedCustomers = customers.map((c) => {
      if (c.id === customerId) {
        return { ...c, ...updatedData };
      }
      return c;
    });

    setCustomers(updatedCustomers);

    // If customer name was changed, sync payments and receipts customerName
    if (updatedData.name && updatedData.name !== customer.name) {
      const updatedPayments = payments.map((p) =>
        p.customerId === customerId ? { ...p, customerName: updatedData.name! } : p
      );
      const updatedReceipts = receipts.map((r) =>
        r.customerId === customerId ? { ...r, customerName: updatedData.name! } : r
      );
      setPayments(updatedPayments);
      setReceipts(updatedReceipts);
      AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments)).catch(console.error);
      AsyncStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(updatedReceipts)).catch(console.error);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
      return { success: true };
    } catch (e: any) {
      console.error('Failed to save updated customer profile', e);
      return { success: false, error: e?.message || 'Failed to save profile' };
    }
  };

  const updateCustomerScheme = async (customerId: string, schemeId: string) => {
    // 1. Mandatory Admin Profile Setup Check
    if (!isAdminProfileComplete(currentAdmin)) {
      return {
        success: false,
        error: 'Chit fund organizer has not completed their profile setup yet. Schemes are temporarily unavailable.',
      };
    }

    // 2. Mandatory Customer Profile Setup Check
    const targetCust = customers.find((c) => c.id === customerId);
    if (!targetCust) {
      return { success: false, error: 'Customer account not found' };
    }
    if (!isCustomerProfileComplete(targetCust)) {
      return {
        success: false,
        error: 'Please complete your profile details (including Email and Residential Address) in the Profile tab before availing a scheme.',
      };
    }

    const selectedScheme = schemes.find((s) => s.id === schemeId);
    if (!selectedScheme) {
      return { success: false, error: 'Scheme not found' };
    }

    const updatedCustomers = customers.map((c) => {
      if (c.id === customerId) {
        const currentEnrolled = c.enrolledSchemeIds || (c.schemeId ? [c.schemeId] : []);
        const newEnrolled = currentEnrolled.includes(schemeId)
          ? currentEnrolled
          : [...currentEnrolled, schemeId];

        // Create an immutable snapshot of the scheme terms at the time of enrollment
        const interest = selectedScheme.interestAmount || 0;
        const payout = selectedScheme.payoutAmount || (selectedScheme.totalAmount - interest);

        const newSnapshot: EnrolledScheme = {
          schemeId: selectedScheme.id,
          schemeName: selectedScheme.name,
          totalAmount: selectedScheme.totalAmount,
          interestAmount: interest,
          payoutAmount: payout,
          collectionAmount: selectedScheme.collectionAmount,
          frequency: selectedScheme.frequency,
          durationWeeksOrMonths: selectedScheme.durationWeeksOrMonths,
          enrolledAt: new Date().toISOString(),
        };

        const existingSnapshots = c.enrolledSchemes || [];
        const filteredSnapshots = existingSnapshots.filter((s) => s.schemeId !== schemeId);
        const newSnapshots = [...filteredSnapshots, newSnapshot];

        return {
          ...c,
          schemeId: selectedScheme.id,
          amountGiven: selectedScheme.totalAmount,
          collectionAmount: selectedScheme.collectionAmount,
          frequency: selectedScheme.frequency,
          enrolledSchemeIds: newEnrolled,
          enrolledSchemes: newSnapshots,
        };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
    } catch (e) {
      console.error('Failed to update customer scheme', e);
    }
    return { success: true };
  };

  const recordPayment = (
    customerId: string,
    amount: number,
    method: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer'
  ) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    const stats = getCustomerStats(customerId);
    if (amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0' };
    }
    if (amount > stats.remainingAmount) {
      return { success: false, error: `Payment cannot exceed remaining balance of ₹${stats.remainingAmount}` };
    }

    const scheme = schemes.find((s) => s.id === customer.schemeId);
    const schemeName = scheme ? scheme.name : 'Chit Scheme';

    const timestamp = new Date();
    const paymentId = `pay-${Date.now()}`;
    const receiptId = `rec-${Date.now()}`;
    
    // Format receipt number: REC-YYYYMM-milliseconds
    const year = timestamp.getFullYear();
    const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${year}${month}-${random}`;
    
    const newRemainingBalance = stats.remainingAmount - amount;

    // 1. Create Payment record
    const newPayment: Payment = {
      id: paymentId,
      customerId,
      customerName: customer.name,
      amount,
      date: timestamp.toISOString(),
      method,
      receiptId,
      schemeName,
    };

    // 2. Create Receipt record
    const newReceipt: Receipt = {
      id: receiptId,
      paymentId,
      receiptNumber,
      customerId,
      customerName: customer.name,
      date: timestamp.toISOString(),
      amount,
      method: `${method} payment`,
      schemeName,
      remainingBalance: newRemainingBalance,
      referenceId: `REF${Date.now().toString().slice(-9)}`,
    };

    // 3. Update customer details (next payment date)
    // If the customer was overdue or due today (nextPaymentDate <= today),
    // recording this collection clears the overdue, so schedule the next installment from today.
    const currentNextDate = new Date(customer.nextPaymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(currentNextDate);
    compareDate.setHours(0, 0, 0, 0);

    const isOverdueOrDueToday = isNaN(compareDate.getTime()) || compareDate.getTime() <= today.getTime();
    const baseDate = isOverdueOrDueToday ? timestamp.toISOString() : customer.nextPaymentDate;
    
    // Number of installment cycles covered by this payment amount
    const installmentAmount = customer.collectionAmount > 0 ? customer.collectionAmount : amount;
    const cycles = Math.max(1, Math.floor(amount / installmentAmount));

    const nextPayDate = calculateNextPaymentDate(baseDate, customer.frequency, cycles);
    const updatedCustomers = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          nextPaymentDate: nextPayDate,
        };
      }
      return c;
    });

    const updatedPayments = [newPayment, ...payments];
    const updatedReceipts = [newReceipt, ...receipts];

    setCustomers(updatedCustomers);
    setPayments(updatedPayments);
    setReceipts(updatedReceipts);
    setSelectedCustomerIdState(customerId);

    // Save to local storage
    AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers)).catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments)).catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(updatedReceipts)).catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CUST, customerId).catch(console.error);

    return { success: true, receipt: newReceipt };
  };

  // Authentication & Registration Methods
  const loginAsAdmin = (username: string, password: string) => {
    const trimmedUser = username.trim().toLowerCase();
    const admin = admins.find((a) => a.username.toLowerCase() === trimmedUser);

    if (!admin) {
      return {
        success: false,
        error: admins.length === 0
          ? 'No Admin registered yet. Please switch to the "Sign Up / Register" tab to register your Admin account.'
          : 'Admin username not registered. Please check or sign up.',
      };
    }
    if (admin.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    setIsLoggedIn(true);
    setCurrentUserRole('admin');
    setCurrentRoleState('admin');
    setCurrentUserId(null);
    setCurrentAdminUser(trimmedUser);

    AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true').catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.ROLE, 'admin').catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID).catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN_USER, trimmedUser).catch(console.error);

    return { success: true };
  };

  const loginAsCustomer = (phone: string, pin: string) => {
    const customer = customers.find((c) => c.phone === phone);
    if (!customer) {
      return {
        success: false,
        error: customers.length === 0
          ? 'No Member accounts registered yet. Please switch to "Sign Up / Register" tab or register via Admin.'
          : 'Phone number not registered. Please sign up or contact Admin.',
      };
    }
    if (customer.pin !== pin) {
      return { success: false, error: 'Incorrect 4-digit PIN' };
    }

    setIsLoggedIn(true);
    setCurrentUserRole('customer');
    setCurrentRoleState('customer');
    setCurrentUserId(customer.id);
    setSelectedCustomerIdState(customer.id);

    AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true').catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.ROLE, 'customer').catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, customer.id).catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CUST, customer.id).catch(console.error);

    return { success: true };
  };

  const registerAdmin = (username: string, password: string) => {
    const exists = admins.some((a) => a.username.toLowerCase() === username.trim().toLowerCase());
    if (exists) {
      return { success: false, error: 'Username is already registered' };
    }

    const newAdmin: AdminCredentials = {
      username: username.trim(),
      password,
    };

    const updatedAdmins = [...admins, newAdmin];
    setAdmins(updatedAdmins);
    setCurrentAdminUser(username.trim());
    AsyncStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(updatedAdmins)).catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN_USER, username.trim()).catch(console.error);

    return { success: true };
  };

  const updateAdminProfile = async (updatedData: Partial<AdminCredentials>) => {
    const targetUsername = currentAdmin?.username || currentAdminUser || (admins.length > 0 ? admins[0].username : null);
    if (!targetUsername && admins.length === 0) {
      return { success: false, error: 'No admin account found to update' };
    }

    const effectiveUser = targetUsername || admins[0].username;
    const updatedAdmins = admins.map((a) => {
      if (a.username.toLowerCase() === effectiveUser.toLowerCase()) {
        return {
          ...a,
          ...updatedData,
          username: a.username, // username stays fixed as account ID
        };
      }
      return a;
    });

    setAdmins(updatedAdmins);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(updatedAdmins));
      return { success: true };
    } catch (e) {
      console.error('Failed to update admin profile:', e);
      return { success: false, error: 'Failed to save admin profile' };
    }
  };

  const registerCustomer = (name: string, phone: string, pin: string, schemeId?: string) => {
    const exists = customers.some((c) => c.phone === phone.trim());
    if (exists) {
      return { success: false, error: 'Phone number is already registered' };
    }

    const selectedScheme = schemeId ? schemes.find((s) => s.id === schemeId) : null;

    if (selectedScheme) {
      addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        pin: pin.trim(),
        schemeId: selectedScheme.id,
        amountGiven: selectedScheme.totalAmount,
        collectionAmount: selectedScheme.collectionAmount,
        frequency: selectedScheme.frequency,
        startDate: new Date().toISOString(),
      });
    } else {
      // In the beginning, nothing should be there.
      // Customer starts with NO scheme until they complete profile and avail one.
      addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        pin: pin.trim(),
        schemeId: '',
        amountGiven: 0,
        collectionAmount: 0,
        frequency: 'monthly',
        startDate: new Date().toISOString(),
      });
    }

    return { success: true };
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUserRole(null);
    setCurrentUserId(null);
    setCurrentAdminUser(null);

    AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false').catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.ROLE).catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID).catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_ADMIN_USER).catch(console.error);
  };

  // Helper selectors
  const currentAdmin: AdminCredentials | null =
    admins.find((a) => a.username.toLowerCase() === currentAdminUser?.toLowerCase()) ||
    (admins.length > 0 ? admins[0] : null);

  const getCustomerStats = (customerId: string): CustomerStats => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      return { paidAmount: 0, remainingAmount: 0, totalPayments: 0, progressPercentage: 0 };
    }

    const customerPayments = payments.filter((p) => p.customerId === customerId);
    const paidAmount = customerPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = Math.max(0, customer.amountGiven - paidAmount);
    const totalPayments = customerPayments.length;
    const progressPercentage = customer.amountGiven > 0 ? (paidAmount / customer.amountGiven) * 100 : 0;

    return {
      paidAmount,
      remainingAmount,
      totalPayments,
      progressPercentage,
    };
  };

  const getAdminStats = (): AdminStats => {
    const totalCustomers = customers.length;
    
    // Total given is the sum of scheme amounts across all active customers
    const totalGiven = customers.reduce((sum, c) => sum + c.amountGiven, 0);
    
    // Total collected is the sum of all payments
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    
    const outstandingAmount = Math.max(0, totalGiven - totalCollected);
    const collectionProgress = totalGiven > 0 ? (totalCollected / totalGiven) * 100 : 0;

    return {
      totalCustomers,
      totalGiven,
      totalCollected,
      outstandingAmount,
      collectionProgress,
    };
  };

  const isCurrentAdminProfileComplete = isAdminProfileComplete(currentAdmin);

  const checkCustomerProfileComplete = (customerId?: string): boolean => {
    const targetId = customerId || selectedCustomerId || currentUserId;
    if (!targetId) return false;
    const cust = customers.find((c) => c.id === targetId);
    return isCustomerProfileComplete(cust);
  };

  const isCurrentCustomerProfileComplete = checkCustomerProfileComplete(
    selectedCustomerId || currentUserId || undefined
  );

  return (
    <ChitDataContext.Provider
      value={{
        currentRole,
        selectedCustomerId,
        customers,
        payments,
        schemes,
        receipts,
        isLoading,
        isLoggedIn,
        currentUserRole,
        currentUserId,
        admins,
        currentAdmin,
        isAdminProfileComplete: isCurrentAdminProfileComplete,
        isCustomerProfileComplete: checkCustomerProfileComplete,
        isCurrentCustomerProfileComplete,
        switchRole,
        selectCustomer,
        addCustomer,
        addScheme,
        updateScheme,
        updateCustomerScheme,
        updateCustomerProfile,
        updateAdminProfile,
        recordPayment,
        resetData,
        loginAsAdmin,
        loginAsCustomer,
        logout,
        registerAdmin,
        registerCustomer,
        getCustomerStats,
        getAdminStats,
      }}
    >
      {children}
    </ChitDataContext.Provider>
  );
};

export const useChitData = () => {
  const context = useContext(ChitDataContext);
  if (context === undefined) {
    throw new Error('useChitData must be used within a ChitDataProvider');
  }
  return context;
};

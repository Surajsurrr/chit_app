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
import { dbService } from '../services/dbService';

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

export interface AdminStats {
  totalCustomers: number;
  totalGiven: number;
  totalCollected: number;
  outstandingAmount: number;
  collectionProgress: number; // percentage
}

export interface CustomerStats {
  paidAmount: number;
  remainingAmount: number;
  totalPayments: number;
  progressPercentage: number;
  payoutAmount: number;
  interestAmount: number;
  totalAmount: number;
}

export interface ChitDataContextType {
  currentRole: UserRole;
  selectedCustomerId: string;
  customers: Customer[];
  payments: Payment[];
  schemes: Scheme[];
  receipts: Receipt[];
  isLoading: boolean;
  isCloudConnected: boolean;
  
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
  addCustomer: (customer: Omit<Customer, 'id' | 'nextPaymentDate'> & { id?: string }) => Promise<{ success: boolean; customerId?: string; error?: string }>;
  updateCustomerTerms: (
    customerId: string,
    terms: {
      payoutAmount?: number;
      interestAmount?: number;
      interestRate?: number;
      totalAmount?: number;
      collectionAmount?: number;
      frequency?: 'daily' | 'weekly' | 'every_3_days' | 'monthly';
      durationInstallments?: number;
      startDate?: string;
      nextPaymentDate?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  addScheme: (scheme: Omit<Scheme, 'id' | 'startDate' | 'status'>) => Promise<void>;
  updateScheme: (
    schemeId: string,
    updatedScheme: Partial<Omit<Scheme, 'id' | 'startDate' | 'status'>>
  ) => Promise<void>;
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
  refreshFromCloud: () => Promise<void>;
  
  // Auth & Registration methods
  loginAsAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsCustomer: (identifier: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registerAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerCustomer: (
    name: string,
    phone: string,
    pin: string,
    schemeId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  
  // Derived state helper methods
  getCustomerStats: (customerId: string) => CustomerStats;
  getAdminStats: () => AdminStats;
}

const ChitDataContext = createContext<ChitDataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROLE: '@chitflow:role',
  SELECTED_CUST: '@chitflow:selected_cust',
  IS_LOGGED_IN: '@chitflow:is_logged_in',
  CURRENT_USER_ID: '@chitflow:current_user_id',
  CURRENT_ADMIN_USER: '@chitflow:current_admin_user',
};

const CLEAN_SLATE_KEY = '@chitflow:clean_slate_v6_central_db';

export const ChitDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>('admin');
  const [selectedCustomerId, setSelectedCustomerIdState] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(dbService.isLive());

  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentAdminUser, setCurrentAdminUser] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminCredentials[]>([]);

  const loadSavedData = async () => {
    try {
      setIsCloudConnected(dbService.isLive());

      // Fetch all entities from centralized dbService (with automatic local cache fallback)
      const [cloudAdmins, cloudCustomers, cloudSchemes, cloudPayments, cloudReceipts] = await Promise.all([
        dbService.fetchAdmins(),
        dbService.fetchCustomers(),
        dbService.fetchSchemes(),
        dbService.fetchPayments(),
        dbService.fetchReceipts(),
      ]);

      // Handle Schemes: If central DB has no schemes yet, seed standard INITIAL_SCHEMES
      let finalSchemes = cloudSchemes;
      if (!finalSchemes || finalSchemes.length === 0) {
        finalSchemes = INITIAL_SCHEMES;
        // Save initial schemes to database / cache in background
        Promise.all(INITIAL_SCHEMES.map((s) => dbService.saveScheme(s))).catch((err) =>
          console.warn('Could not auto-seed schemes into DB:', err)
        );
      }

      setSchemes(finalSchemes);
      setAdmins(cloudAdmins || []);
      setCustomers(cloudCustomers || []);
      setPayments(cloudPayments || []);
      setReceipts(cloudReceipts || []);

      // Restore session preferences
      const savedRole = await AsyncStorage.getItem(STORAGE_KEYS.ROLE);
      const savedSelectedCust = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CUST);
      const savedIsLoggedIn = await AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
      const savedCurrentUserId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      const savedCurrentAdminUser = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN_USER);

      if (savedRole) {
        setCurrentRoleState(savedRole as UserRole);
        setCurrentUserRole(savedRole as UserRole);
      }
      if (savedSelectedCust) setSelectedCustomerIdState(savedSelectedCust);
      if (savedIsLoggedIn === 'true') setIsLoggedIn(true);
      if (savedCurrentUserId) setCurrentUserId(savedCurrentUserId);
      if (savedCurrentAdminUser) setCurrentAdminUser(savedCurrentAdminUser);
    } catch (error) {
      console.error('Error loading data in ChitDataContext:', error);
      // Ensure at least INITIAL_SCHEMES are present in memory
      setSchemes(INITIAL_SCHEMES);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data from centralized DB / storage on startup
  useEffect(() => {
    loadSavedData();
  }, []);

  const refreshFromCloud = async () => {
    try {
      setIsCloudConnected(dbService.isLive());
      const [cloudAdmins, cloudCustomers, cloudSchemes, cloudPayments, cloudReceipts] = await Promise.all([
        dbService.fetchAdmins(),
        dbService.fetchCustomers(),
        dbService.fetchSchemes(),
        dbService.fetchPayments(),
        dbService.fetchReceipts(),
      ]);

      if (cloudAdmins && cloudAdmins.length >= 0) setAdmins(cloudAdmins);
      if (cloudCustomers && cloudCustomers.length >= 0) setCustomers(cloudCustomers);
      if (cloudSchemes && cloudSchemes.length > 0) setSchemes(cloudSchemes);
      if (cloudPayments && cloudPayments.length >= 0) setPayments(cloudPayments);
      if (cloudReceipts && cloudReceipts.length >= 0) setReceipts(cloudReceipts);
    } catch (err) {
      console.warn('refreshFromCloud failed:', err);
    }
  };

  const resetData = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.clear();
      await AsyncStorage.setItem(CLEAN_SLATE_KEY, 'true');
      setCurrentRoleState('admin');
      setSelectedCustomerIdState('');
      setIsLoggedIn(false);
      setCurrentUserRole(null);
      setCurrentUserId(null);
      setCurrentAdminUser(null);
      await loadSavedData();
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

  const generateNextCustomerId = (): string => {
    let maxNum = 100;
    customers.forEach((c) => {
      const match = c.id.match(/^CUST-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `CUST-${maxNum + 1}`;
  };

  const addCustomer = async (
    newCustomerData: Omit<Customer, 'id' | 'nextPaymentDate'> & { id?: string }
  ): Promise<{ success: boolean; customerId?: string; error?: string }> => {
    const newId = (newCustomerData.id && newCustomerData.id.trim().length > 0)
      ? newCustomerData.id.trim().toUpperCase()
      : generateNextCustomerId();

    const payout = newCustomerData.payoutAmount ?? Math.max(0, (newCustomerData.amountGiven || 0) - (newCustomerData.interestAmount || 0));
    const interest = newCustomerData.interestAmount ?? Math.max(0, (newCustomerData.amountGiven || 0) - payout);
    const total = newCustomerData.totalAmount || (payout + interest) || newCustomerData.amountGiven || 0;
    const colAmt = newCustomerData.collectionAmount || 0;
    const dur = newCustomerData.durationInstallments || (colAmt > 0 && total > 0 ? Math.ceil(total / colAmt) : 50);
    const intRate = newCustomerData.interestRate ?? (payout > 0 ? (interest / payout) * 100 : 0);

    const newCustomer: Customer = {
      ...newCustomerData,
      id: newId,
      payoutAmount: payout,
      interestAmount: interest,
      interestRate: intRate,
      totalAmount: total,
      amountGiven: total,
      collectionAmount: colAmt,
      durationInstallments: dur,
      schemeId: '',
      // For a new customer, next payment date is initial startDate
      nextPaymentDate: newCustomerData.startDate || new Date().toISOString(),
      enrolledSchemeIds: [],
      enrolledSchemes: [],
    };

    const res = await dbService.registerCustomer(newCustomer);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    return { success: true, customerId: newId };
  };

  const updateCustomerTerms = async (
    customerId: string,
    terms: {
      payoutAmount?: number;
      interestAmount?: number;
      interestRate?: number;
      totalAmount?: number;
      collectionAmount?: number;
      frequency?: 'daily' | 'weekly' | 'every_3_days' | 'monthly';
      durationInstallments?: number;
      startDate?: string;
      nextPaymentDate?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    const target = customers.find((c) => c.id === customerId);
    if (!target) {
      return { success: false, error: 'Customer record not found' };
    }

    const payout = terms.payoutAmount ?? target.payoutAmount ?? 0;
    const interest = terms.interestAmount ?? target.interestAmount ?? 0;
    const total = terms.totalAmount ?? (payout + interest);
    const colAmt = terms.collectionAmount ?? target.collectionAmount ?? 0;
    const freq = terms.frequency ?? target.frequency ?? 'daily';
    const dur = terms.durationInstallments ?? target.durationInstallments ?? (colAmt > 0 && total > 0 ? Math.ceil(total / colAmt) : 50);
    const intRate = terms.interestRate ?? (payout > 0 ? (interest / payout) * 100 : target.interestRate || 0);

    const updates: Partial<Customer> = {
      payoutAmount: payout,
      interestAmount: interest,
      interestRate: intRate,
      totalAmount: total,
      amountGiven: total,
      collectionAmount: colAmt,
      frequency: freq,
      durationInstallments: dur,
      ...(terms.startDate ? { startDate: terms.startDate } : {}),
      ...(terms.nextPaymentDate ? { nextPaymentDate: terms.nextPaymentDate } : {}),
    };

    const res = await dbService.updateCustomer(customerId, updates);
    if (!res.success) {
      return res;
    }

    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, ...updates } : c))
    );

    return { success: true };
  };

  const addScheme = async (newSchemeData: Omit<Scheme, 'id' | 'startDate' | 'status'>): Promise<void> => {
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
      await dbService.saveScheme(newScheme);
    } catch (e) {
      console.error('Failed to save scheme to central database:', e);
    }
  };

  const updateScheme = async (
    schemeId: string,
    updatedScheme: Partial<Omit<Scheme, 'id' | 'startDate' | 'status'>>
  ): Promise<void> => {
    const existing = schemes.find((s) => s.id === schemeId);
    const hasEnrolledCustomers = customers.some(
      (c) => c.schemeId === schemeId || c.enrolledSchemeIds?.includes(schemeId)
    );

    const total = updatedScheme.totalAmount ?? existing?.totalAmount ?? 50000;
    const interest = updatedScheme.interestAmount ?? existing?.interestAmount ?? 0;
    const payout = updatedScheme.payoutAmount ?? (total - interest);
    const collection = updatedScheme.collectionAmount ?? existing?.collectionAmount ?? 1000;
    const freq = updatedScheme.frequency ?? existing?.frequency ?? 'daily';
    const dur = updatedScheme.durationWeeksOrMonths ?? existing?.durationWeeksOrMonths ?? 50;

    const newDesc =
      updatedScheme.description ||
      `Total Chit Value is ₹${total.toLocaleString('en-IN')}. An upfront interest of ₹${interest.toLocaleString(
        'en-IN'
      )} is deducted, giving the customer a net payout of ₹${payout.toLocaleString(
        'en-IN'
      )}. The customer repays ₹${total.toLocaleString(
        'en-IN'
      )} across ${dur} installments of ₹${collection.toLocaleString('en-IN')} (${
        freq === 'every_3_days' ? 'every 3 days' : freq
      }).`;

    if (hasEnrolledCustomers) {
      // BUSINESS RULE: If customers are already enrolled in this scheme, any edited interest/payout/terms
      // are posted as a BRAND NEW SCHEME with its own unique ID.
      // The original scheme remains with the existing enrolled customers under their locked-in terms.
      const newSchemeId = `scheme-${Date.now()}`;
      const newPostedScheme: Scheme = {
        id: newSchemeId,
        name: updatedScheme.name || existing?.name || 'New Scheme',
        totalAmount: total,
        interestAmount: interest,
        payoutAmount: payout,
        collectionAmount: collection,
        frequency: freq,
        durationWeeksOrMonths: dur,
        description: newDesc,
        startDate: new Date().toISOString(),
        status: 'active',
      };

      setSchemes((prev) => [...prev, newPostedScheme]);
      await dbService.saveScheme(newPostedScheme);
    } else {
      const target = schemes.find((s) => s.id === schemeId);
      if (target) {
        const merged: Scheme = {
          ...target,
          ...updatedScheme,
          description: newDesc,
        };
        setSchemes((prev) => prev.map((s) => (s.id === schemeId ? merged : s)));
        await dbService.saveScheme(merged);
      }
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

    const res = await dbService.updateCustomer(customerId, updatedData);
    if (!res.success) {
      return res;
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
    }

    return { success: true };
  };

  const updateCustomerScheme = async (
    customerId: string,
    schemeId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetCust = customers.find((c) => c.id === customerId);
    if (!targetCust) {
      return { success: false, error: 'Customer account not found' };
    }

    const selectedScheme = schemes.find((s) => s.id === schemeId);
    if (!selectedScheme) {
      return { success: false, error: 'Scheme not found' };
    }

    const nextPayment = calculateNextPaymentDate(new Date().toISOString(), selectedScheme.frequency, 1);
    const currentEnrolled = targetCust.enrolledSchemeIds || (targetCust.schemeId ? [targetCust.schemeId] : []);
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

    const existingSnapshots = targetCust.enrolledSchemes || [];
    const filteredSnapshots = existingSnapshots.filter((s) => s.schemeId !== schemeId);
    const newSnapshots = [...filteredSnapshots, newSnapshot];

    const updates: Partial<Customer> = {
      schemeId: selectedScheme.id,
      amountGiven: selectedScheme.totalAmount,
      collectionAmount: selectedScheme.collectionAmount,
      frequency: selectedScheme.frequency,
      nextPaymentDate: nextPayment,
      enrolledSchemeIds: newEnrolled,
      enrolledSchemes: newSnapshots,
    };

    const res = await dbService.updateCustomer(customerId, updates);
    if (!res.success) {
      return res;
    }

    const updatedCustomers = customers.map((c) => {
      if (c.id === customerId) {
        return { ...c, ...updates };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    return { success: true };
  };

  const recordPayment = (
    customerId: string,
    amount: number,
    method: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer'
  ): { success: boolean; error?: string; receipt?: Receipt } => {
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

    // Asynchronously synchronize with central database
    dbService.recordPayment(newPayment, newReceipt).catch((err) =>
      console.error('dbService.recordPayment error:', err)
    );
    dbService.updateCustomer(customerId, { nextPaymentDate: nextPayDate }).catch((err) =>
      console.error('dbService.updateCustomer nextPaymentDate error:', err)
    );

    return { success: true, receipt: newReceipt };
  };

  // Centralized Authentication & Registration Methods
  const loginAsAdmin = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim();
    const res = await dbService.loginAdmin(cleanUser, password);

    if (!res.success || !res.admin) {
      return {
        success: false,
        error: res.error || 'Authentication failed. Please check credentials or register.',
      };
    }

    const admin = res.admin;
    setIsLoggedIn(true);
    setCurrentUserRole('admin');
    setCurrentRoleState('admin');
    setCurrentUserId(null);
    setCurrentAdminUser(admin.username);

    // Keep admin state synchronized
    setAdmins((prev) => {
      const exists = prev.some((a) => a.username.toLowerCase() === admin.username.toLowerCase());
      return exists
        ? prev.map((a) => (a.username.toLowerCase() === admin.username.toLowerCase() ? admin : a))
        : [...prev, admin];
    });

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.ROLE, 'admin');
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN_USER, admin.username);
    } catch (e) {
      console.error('AsyncStorage session error:', e);
    }

    // Refresh cloud data in background so organizer has latest members & collections from all devices
    refreshFromCloud().catch(console.warn);

    return { success: true };
  };

  const loginAsCustomer = async (
    identifier: string,
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim();
    const res = await dbService.loginCustomer(cleanId, pin);

    if (!res.success || !res.customer) {
      return {
        success: false,
        error: res.error || 'Authentication failed. Please verify Customer ID / Phone and 4-digit PIN.',
      };
    }

    const customer = res.customer;
    setIsLoggedIn(true);
    setCurrentUserRole('customer');
    setCurrentRoleState('customer');
    setCurrentUserId(customer.id);
    setSelectedCustomerIdState(customer.id);

    // Keep customer state synchronized
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === customer.id);
      return exists ? prev.map((c) => (c.id === customer.id ? customer : c)) : [...prev, customer];
    });

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.ROLE, 'customer');
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, customer.id);
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CUST, customer.id);
    } catch (e) {
      console.error('AsyncStorage session error:', e);
    }

    // Refresh cloud data in background
    refreshFromCloud().catch(console.warn);

    return { success: true };
  };

  const registerAdmin = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim();
    const res = await dbService.registerAdmin(cleanUser, password);

    if (!res.success) {
      return res;
    }

    const newAdmin: AdminCredentials = {
      username: cleanUser,
      password,
    };

    setAdmins((prev) => {
      const filtered = prev.filter((a) => a.username.toLowerCase() !== cleanUser.toLowerCase());
      return [...filtered, newAdmin];
    });
    setCurrentAdminUser(cleanUser);

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN_USER, cleanUser);
    } catch (e) {
      console.error(e);
    }

    return { success: true };
  };

  const updateAdminProfile = async (
    updatedData: Partial<AdminCredentials>
  ): Promise<{ success: boolean; error?: string }> => {
    const targetUsername =
      currentAdmin?.username || currentAdminUser || (admins.length > 0 ? admins[0].username : null);
    if (!targetUsername && admins.length === 0) {
      return { success: false, error: 'No admin account found to update' };
    }

    const effectiveUser = targetUsername || admins[0].username;
    const res = await dbService.updateAdminProfile(effectiveUser, updatedData);

    if (!res.success) {
      return res;
    }

    const updatedAdmins = admins.map((a) => {
      if (a.username.toLowerCase() === effectiveUser.toLowerCase()) {
        return {
          ...a,
          ...updatedData,
          username: a.username,
        };
      }
      return a;
    });

    setAdmins(updatedAdmins);
    return { success: true };
  };

  const registerCustomer = async (
    name: string,
    phone: string,
    pin: string,
    schemeId?: string
  ): Promise<{ success: boolean; customerId?: string; error?: string }> => {
    return await addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      pin: pin.trim(),
      payoutAmount: 0,
      interestAmount: 0,
      interestRate: 0,
      totalAmount: 0,
      amountGiven: 0,
      collectionAmount: 0,
      durationInstallments: 50,
      frequency: 'daily',
      startDate: new Date().toISOString(),
    });
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUserRole(null);
    setCurrentUserId(null);
    setCurrentAdminUser(null);
    setSelectedCustomerIdState('');

    AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false').catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.ROLE).catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID).catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_ADMIN_USER).catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_CUST).catch(console.error);
  };

  // Helper selectors
  const currentAdmin: AdminCredentials | null =
    admins.find((a) => a.username.toLowerCase() === currentAdminUser?.toLowerCase()) ||
    (admins.length > 0 ? admins[0] : null);

  const getCustomerStats = (customerId: string): CustomerStats => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      return {
        paidAmount: 0,
        remainingAmount: 0,
        totalPayments: 0,
        progressPercentage: 0,
        payoutAmount: 0,
        interestAmount: 0,
        totalAmount: 0,
      };
    }

    const totalDue = customer.totalAmount || customer.amountGiven || 0;
    const payout = customer.payoutAmount ?? (totalDue - (customer.interestAmount || 0));
    const interest = customer.interestAmount ?? (totalDue - payout);

    const customerPayments = payments.filter((p) => p.customerId === customerId);
    const paidAmount = customerPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = Math.max(0, totalDue - paidAmount);
    const totalPayments = customerPayments.length;
    const progressPercentage = totalDue > 0 ? (paidAmount / totalDue) * 100 : 0;

    return {
      paidAmount,
      remainingAmount,
      totalPayments,
      progressPercentage,
      payoutAmount: payout,
      interestAmount: interest,
      totalAmount: totalDue,
    };
  };

  const getAdminStats = (): AdminStats => {
    const totalCustomers = customers.length;
    const totalGiven = customers.reduce((sum, c) => sum + c.amountGiven, 0);
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
        isCloudConnected,
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
        updateCustomerTerms,
        addScheme,
        updateScheme,
        updateCustomerScheme,
        updateCustomerProfile,
        updateAdminProfile,
        recordPayment,
        resetData,
        refreshFromCloud,
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

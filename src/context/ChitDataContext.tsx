import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Customer,
  Payment,
  Scheme,
  Receipt,
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
}

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
  ADMINS: '@chitflow:admins',
};

const DEFAULT_ADMINS: AdminCredentials[] = [
  { username: 'admin', password: 'admin123' }
];

export const ChitDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>('admin');
  const [selectedCustomerId, setSelectedCustomerIdState] = useState<string>('cust-1'); // default to Ravi
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminCredentials[]>([]);

  // Load data from storage on startup
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedRole = await AsyncStorage.getItem(STORAGE_KEYS.ROLE);
        const savedSelectedCust = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CUST);
        const savedCustomers = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        const savedPayments = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
        const savedSchemes = await AsyncStorage.getItem(STORAGE_KEYS.SCHEMES);
        const savedReceipts = await AsyncStorage.getItem(STORAGE_KEYS.RECEIPTS);
        const savedIsLoggedIn = await AsyncStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
        const savedCurrentUserId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
        const savedAdmins = await AsyncStorage.getItem(STORAGE_KEYS.ADMINS);

        if (savedRole) {
          setCurrentRoleState(savedRole as UserRole);
          setCurrentUserRole(savedRole as UserRole);
        }
        if (savedSelectedCust) setSelectedCustomerIdState(savedSelectedCust);
        if (savedIsLoggedIn === 'true') setIsLoggedIn(true);
        if (savedCurrentUserId) setCurrentUserId(savedCurrentUserId);

        // Load admins with robust default fallback
        if (savedAdmins) {
          try {
            const parsed: AdminCredentials[] = JSON.parse(savedAdmins);
            const hasDefault = parsed.some((a) => a.username.toLowerCase() === 'admin');
            const mergedAdmins = hasDefault ? parsed : [...DEFAULT_ADMINS, ...parsed];
            setAdmins(mergedAdmins);
          } catch {
            await AsyncStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(DEFAULT_ADMINS));
            setAdmins(DEFAULT_ADMINS);
          }
        } else {
          await AsyncStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(DEFAULT_ADMINS));
          setAdmins(DEFAULT_ADMINS);
        }

        if (savedCustomers && savedPayments && savedSchemes && savedReceipts) {
          const parsedCustomers: Customer[] = JSON.parse(savedCustomers).map((c: Customer) => {
            const initial = INITIAL_CUSTOMERS.find((init) => init.id === c.id);
            return {
              ...c,
              email: c.email || initial?.email,
              address: c.address || initial?.address,
              city: c.city || initial?.city,
              pincode: c.pincode || initial?.pincode,
              occupation: c.occupation || initial?.occupation,
              nomineeName: c.nomineeName || initial?.nomineeName,
              nomineeRelation: c.nomineeRelation || initial?.nomineeRelation,
              idProofType: c.idProofType || initial?.idProofType,
              idProofNumber: c.idProofNumber || initial?.idProofNumber,
            };
          });
          const parsedPayments: Payment[] = JSON.parse(savedPayments);
          const parsedReceipts: Receipt[] = JSON.parse(savedReceipts);
          const parsedSchemes: Scheme[] = JSON.parse(savedSchemes).map((s: Scheme) => {
            const initialMatch = INITIAL_SCHEMES.find((init) => init.id === s.id);
            const interest = (s.interestAmount !== undefined && s.interestAmount > 0)
              ? s.interestAmount
              : (initialMatch?.interestAmount ?? (s.totalAmount * 0.08));
            const payout = (s.payoutAmount !== undefined && s.payoutAmount > 0 && s.payoutAmount < s.totalAmount)
              ? s.payoutAmount
              : Math.max(0, s.totalAmount - interest);
            return {
              ...s,
              interestAmount: interest,
              payoutAmount: payout,
            };
          });

          // Reconcile: Ensure every payment in parsedPayments has a receipt
          const receiptMap = new Map<string, Receipt>();
          parsedReceipts.forEach((r) => {
            receiptMap.set(r.id, r);
            if (r.paymentId) receiptMap.set(r.paymentId, r);
          });

          const reconciledReceipts = [...parsedReceipts];
          parsedPayments.forEach((p) => {
            if (!receiptMap.has(p.receiptId) && !receiptMap.has(p.id)) {
              const cust = parsedCustomers.find((c) => c.id === p.customerId);
              const sch = parsedSchemes.find((s) => s.id === cust?.schemeId);
              const pDate = new Date(p.date);
              const year = isNaN(pDate.getFullYear()) ? '2026' : pDate.getFullYear().toString();
              const month = isNaN(pDate.getMonth()) ? '08' : (pDate.getMonth() + 1).toString().padStart(2, '0');
              const suffix = p.id.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '1001';

              const newRec: Receipt = {
                id: p.receiptId || `rec-${p.id}`,
                paymentId: p.id,
                receiptNumber: `REC-${year}${month}-${suffix}`,
                customerId: p.customerId,
                customerName: p.customerName || cust?.name || 'Customer',
                date: p.date,
                amount: p.amount,
                method: `${p.method} payment`,
                schemeName: p.schemeName || sch?.name || 'Chit Scheme',
                remainingBalance: Math.max(0, (cust?.amountGiven || 50000) - p.amount),
                referenceId: `REF${p.id.replace(/[^0-9]/g, '').slice(-9).padStart(9, '9')}`,
              };

              reconciledReceipts.push(newRec);
              receiptMap.set(newRec.id, newRec);
              receiptMap.set(p.id, newRec);
            }
          });

          reconciledReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          setCustomers(parsedCustomers);
          setPayments(parsedPayments);
          setSchemes(parsedSchemes);
          setReceipts(reconciledReceipts);

          if (reconciledReceipts.length !== parsedReceipts.length) {
            AsyncStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(reconciledReceipts)).catch(console.error);
          }
        } else {
          // No saved data, load initial mocks and save them
          await initializeData();
        }
      } catch (error) {
        console.error('Error loading local data:', error);
        // Fallback to mocks
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
      
      setCustomers(INITIAL_CUSTOMERS);
      setPayments(INITIAL_PAYMENTS);
      setSchemes(INITIAL_SCHEMES);
      setReceipts(INITIAL_RECEIPTS);
      setAdmins(DEFAULT_ADMINS);
    } catch (e) {
      console.error('Failed to initialize mock storage data', e);
    }
  };

  const resetData = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.clear();
      await initializeData();
      setCurrentRoleState('admin');
      setSelectedCustomerIdState('cust-1');
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
    const newCustomer: Customer = {
      ...newCustomerData,
      id: newId,
      // For a new customer, next payment date is initial startDate
      nextPaymentDate: newCustomerData.startDate,
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

    // Sync enrolled customer parameters in real-time
    const updatedCustomers = customers.map((c) => {
      if (c.schemeId === schemeId) {
        return {
          ...c,
          amountGiven: updatedScheme.totalAmount !== undefined ? updatedScheme.totalAmount : c.amountGiven,
          collectionAmount: updatedScheme.collectionAmount !== undefined ? updatedScheme.collectionAmount : c.collectionAmount,
          frequency: updatedScheme.frequency !== undefined ? updatedScheme.frequency : c.frequency,
        };
      }
      return c;
    });

    setSchemes(updatedSchemes);
    setCustomers(updatedCustomers);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEMES, JSON.stringify(updatedSchemes));
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
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
    const selectedScheme = schemes.find((s) => s.id === schemeId);
    if (!selectedScheme) {
      return { success: false, error: 'Scheme not found' };
    }

    const updatedCustomers = customers.map((c) => {
      if (c.id === customerId) {
        const currentEnrolled = c.enrolledSchemeIds || [c.schemeId];
        const newEnrolled = currentEnrolled.includes(schemeId)
          ? currentEnrolled
          : [...currentEnrolled, schemeId];

        return {
          ...c,
          schemeId: selectedScheme.id,
          amountGiven: selectedScheme.totalAmount,
          collectionAmount: selectedScheme.collectionAmount,
          frequency: selectedScheme.frequency,
          enrolledSchemeIds: newEnrolled,
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
    const admin = admins.find((a) => a.username.toLowerCase() === trimmedUser) ||
      (trimmedUser === 'admin' ? DEFAULT_ADMINS[0] : undefined);

    if (!admin) {
      return { success: false, error: 'Admin username not registered' };
    }
    if (admin.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    setIsLoggedIn(true);
    setCurrentUserRole('admin');
    setCurrentRoleState('admin');
    setCurrentUserId(null);

    AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true').catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.ROLE, 'admin').catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID).catch(console.error);

    return { success: true };
  };

  const loginAsCustomer = (phone: string, pin: string) => {
    const customer = customers.find((c) => c.phone === phone);
    if (!customer) {
      return { success: false, error: 'Phone number not registered' };
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
    AsyncStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(updatedAdmins)).catch(console.error);

    return { success: true };
  };

  const registerCustomer = (name: string, phone: string, pin: string, schemeId?: string) => {
    const exists = customers.some((c) => c.phone === phone.trim());
    if (exists) {
      return { success: false, error: 'Phone number is already registered' };
    }

    const selectedScheme = schemeId 
      ? schemes.find((s) => s.id === schemeId) 
      : (schemes.length > 0 ? schemes[0] : null);

    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      pin: pin.trim(),
      schemeId: selectedScheme ? selectedScheme.id : 'scheme-1',
      amountGiven: selectedScheme ? selectedScheme.totalAmount : 50000,
      collectionAmount: selectedScheme ? selectedScheme.collectionAmount : 1000,
      frequency: selectedScheme ? selectedScheme.frequency : 'daily',
      startDate: new Date().toISOString(),
    });

    return { success: true };
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUserRole(null);
    setCurrentUserId(null);

    AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false').catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.ROLE).catch(console.error);
    AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID).catch(console.error);
  };

  // Helper selectors
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
        switchRole,
        selectCustomer,
        addCustomer,
        addScheme,
        updateScheme,
        updateCustomerScheme,
        updateCustomerProfile,
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

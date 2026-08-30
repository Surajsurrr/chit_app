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
  
  // Actions
  switchRole: (role: UserRole) => void;
  selectCustomer: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'nextPaymentDate'>) => void;
  addScheme: (scheme: Omit<Scheme, 'id' | 'startDate' | 'status'>) => void;
  recordPayment: (
    customerId: string,
    amount: number,
    method: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer'
  ) => { success: boolean; error?: string; receipt?: Receipt };
  resetData: () => Promise<void>;
  
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
};

export const ChitDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>('admin');
  const [selectedCustomerId, setSelectedCustomerIdState] = useState<string>('cust-1'); // default to Ravi
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

        if (savedRole) setCurrentRoleState(savedRole as UserRole);
        if (savedSelectedCust) setSelectedCustomerIdState(savedSelectedCust);

        if (savedCustomers && savedPayments && savedSchemes && savedReceipts) {
          setCustomers(JSON.parse(savedCustomers));
          setPayments(JSON.parse(savedPayments));
          setSchemes(JSON.parse(savedSchemes));
          setReceipts(JSON.parse(savedReceipts));
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
      
      setCustomers(INITIAL_CUSTOMERS);
      setPayments(INITIAL_PAYMENTS);
      setSchemes(INITIAL_SCHEMES);
      setReceipts(INITIAL_RECEIPTS);
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
    } catch (e) {
      console.error('Error resetting data context', e);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (role: UserRole) => {
    setCurrentRoleState(role);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ROLE, role);
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
    const nextPayDate = calculateNextPaymentDate(customer.nextPaymentDate, customer.frequency);
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

    // Save to local storage asynchronously
    AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers)).catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments)).catch(console.error);
    AsyncStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(updatedReceipts)).catch(console.error);

    return { success: true, receipt: newReceipt };
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
        switchRole,
        selectCustomer,
        addCustomer,
        addScheme,
        recordPayment,
        resetData,
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

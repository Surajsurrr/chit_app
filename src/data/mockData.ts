import { calculateNextPaymentDate } from '../utils/dateHelpers';

export interface EnrolledScheme {
  schemeId: string;
  schemeName: string;
  totalAmount: number;
  interestAmount: number;
  payoutAmount: number;
  collectionAmount: number;
  frequency: 'daily' | 'every_3_days' | 'weekly' | 'monthly';
  durationWeeksOrMonths: number;
  enrolledAt: string;
}

export interface Customer {
  id: string; // Unique Customer ID e.g. CUST-101
  name: string;
  phone: string;
  pin: string; // 4-digit PIN for login
  schemeId?: string;
  amountGiven: number; // Total amount to be repaid (mirrors totalAmount)
  totalAmount?: number; // Total amount to collect (payoutAmount + interestAmount)
  payoutAmount?: number; // Net cash disbursed to customer
  interestAmount?: number; // Total interest charged
  interestRate?: number; // Interest rate percentage
  collectionAmount: number; // Installment amount to collect
  durationInstallments?: number; // Number of installment cycles
  frequency: 'daily' | 'every_3_days' | 'weekly' | 'monthly';
  startDate: string;
  nextPaymentDate: string;
  enrolledSchemeIds?: string[];
  enrolledSchemes?: EnrolledScheme[];
  // Extended Profile & KYC Details
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  occupation?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  idProofType?: 'Aadhaar' | 'PAN' | 'Voter ID' | 'Driving License';
  idProofNumber?: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  method: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer';
  receiptId: string;
  schemeName: string;
}

export interface Scheme {
  id: string;
  name: string;
  totalAmount: number; // Total Scheme Value e.g. 50,000
  interestAmount: number; // Interest / Deduction e.g. 4,000
  payoutAmount: number; // Net Customer Payout = totalAmount - interestAmount e.g. 46,000
  collectionAmount: number; // Installment amount e.g. 1,000
  frequency: 'daily' | 'every_3_days' | 'weekly' | 'monthly';
  durationWeeksOrMonths: number;
  description?: string;
  startDate: string;
  status: 'active' | 'completed';
}

export interface Receipt {
  id: string;
  paymentId: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  method: string;
  schemeName: string;
  remainingBalance: number;
  referenceId: string;
}

export const INITIAL_SCHEMES: Scheme[] = [
  {
    id: 'scheme-1',
    name: 'Bronze 3-Day 50K',
    totalAmount: 50000,
    interestAmount: 4000,
    payoutAmount: 46000,
    collectionAmount: 1000,
    frequency: 'every_3_days',
    durationWeeksOrMonths: 50, // 50 installments
    description: 'Total Chit Value is ₹50,000. An upfront interest of ₹4,000 is deducted, giving the customer a net payout of ₹46,000. The customer repays ₹50,000 across 50 installments of ₹1,000 (every 3 days).',
    startDate: '2026-05-15T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'scheme-2',
    name: 'Silver Daily 25K',
    totalAmount: 25000,
    interestAmount: 2000,
    payoutAmount: 23000,
    collectionAmount: 500,
    frequency: 'daily',
    durationWeeksOrMonths: 50, // 50 installments
    description: 'Total Chit Value is ₹25,000. An upfront interest of ₹2,000 is deducted, giving the customer a net payout of ₹23,000. The customer repays ₹25,000 across 50 daily installments of ₹500.',
    startDate: '2026-08-05T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'scheme-3',
    name: 'Gold Weekly 1L',
    totalAmount: 100000,
    interestAmount: 8000,
    payoutAmount: 92000,
    collectionAmount: 2000,
    frequency: 'weekly',
    durationWeeksOrMonths: 50, // 50 installments
    description: 'Total Chit Value is ₹1,00,000. An upfront interest of ₹8,000 is deducted, giving the customer a net payout of ₹92,000. The customer repays ₹1,00,000 across 50 weekly installments of ₹2,000.',
    startDate: '2026-04-10T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'scheme-4',
    name: 'Platinum Monthly 2L',
    totalAmount: 200000,
    interestAmount: 15000,
    payoutAmount: 185000,
    collectionAmount: 5000,
    frequency: 'monthly',
    durationWeeksOrMonths: 40, // 40 installments
    description: 'Total Chit Value is ₹2,00,000. An upfront interest of ₹15,000 is deducted, giving the customer a net payout of ₹1,85,000. The customer repays ₹2,00,000 across 40 monthly installments of ₹5,000.',
    startDate: '2026-01-15T00:00:00.000Z',
    status: 'active',
  },
];

// Empty initial mock data for fresh registration and onboarding
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_RECEIPTS: Receipt[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];

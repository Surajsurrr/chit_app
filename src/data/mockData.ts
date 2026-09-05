import { calculateNextPaymentDate } from '../utils/dateHelpers';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  pin: string; // 4-digit PIN for login
  schemeId: string;
  amountGiven: number;
  collectionAmount: number;
  frequency: 'daily' | 'every_3_days' | 'weekly' | 'monthly';
  startDate: string;
  nextPaymentDate: string;
  enrolledSchemeIds?: string[];
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

// Reference date is 2026-08-31T00:00:00.000Z
// We will generate payments backwards from specific last payment dates.

const generatePaymentsAndReceipts = () => {
  const payments: Payment[] = [];
  const receipts: Receipt[] = [];

  // 1. Ravi Kumar (cust-1) - scheme-1 (Bronze 3-Day 50K, Collection: 1000)
  // Total Paid: 33,000 (33 payments). Last payment: 25 Aug 2026.
  // Payments are spaced every 3 days.
  const raviLastPaymentDate = new Date('2026-08-25T10:00:00.000Z');
  for (let i = 0; i < 33; i++) {
    const paymentDate = new Date(raviLastPaymentDate.getTime());
    paymentDate.setDate(raviLastPaymentDate.getDate() - i * 3);
    
    const id = `pay-ravi-${33 - i}`;
    const receiptId = `rec-ravi-${33 - i}`;
    const dateStr = paymentDate.toISOString();
    const method: 'UPI' | 'Cash' = i % 2 === 0 ? 'UPI' : 'Cash';
    
    payments.push({
      id,
      customerId: 'cust-1',
      customerName: 'Ravi Kumar',
      amount: 1000,
      date: dateStr,
      method,
      receiptId,
      schemeName: 'Bronze 3-Day 50K',
    });

    receipts.push({
      id: receiptId,
      paymentId: id,
      receiptNumber: `REC-202608-${(100 + (33 - i)).toString().padStart(4, '0')}`,
      customerId: 'cust-1',
      customerName: 'Ravi Kumar',
      date: dateStr,
      amount: 1000,
      method: method === 'UPI' ? 'UPI payment' : 'Cash payment',
      schemeName: 'Bronze 3-Day 50K',
      remainingBalance: 50000 - (33 - i) * 1000,
      referenceId: `REF${(987654320 + (33 - i)).toString()}`,
    });
  }

  // 2. Priya S (cust-2) - scheme-2 (Silver Daily 25K, Collection: 500)
  // Total Paid: 12,000 (24 payments). Last payment: 30 Aug 2026. Spaced daily.
  const priyaLastPaymentDate = new Date('2026-08-30T11:30:00.000Z');
  for (let i = 0; i < 24; i++) {
    const paymentDate = new Date(priyaLastPaymentDate.getTime());
    paymentDate.setDate(priyaLastPaymentDate.getDate() - i);
    
    const id = `pay-priya-${24 - i}`;
    const receiptId = `rec-priya-${24 - i}`;
    const dateStr = paymentDate.toISOString();
    const method: 'UPI' | 'Cash' = i % 3 === 0 ? 'UPI' : 'Cash';
    
    payments.push({
      id,
      customerId: 'cust-2',
      customerName: 'Priya S',
      amount: 500,
      date: dateStr,
      method,
      receiptId,
      schemeName: 'Silver Daily 25K',
    });

    receipts.push({
      id: receiptId,
      paymentId: id,
      receiptNumber: `REC-202608-${(200 + (24 - i)).toString().padStart(4, '0')}`,
      customerId: 'cust-2',
      customerName: 'Priya S',
      date: dateStr,
      amount: 500,
      method: method === 'UPI' ? 'UPI payment' : 'Cash payment',
      schemeName: 'Silver Daily 25K',
      remainingBalance: 25000 - (24 - i) * 500,
      referenceId: `REF${(876543210 + (24 - i)).toString()}`,
    });
  }

  // 3. Anitha R (cust-3) - scheme-3 (Gold Weekly 1L, Collection: 2000)
  // Total Paid: 40,000 (20 payments). Last payment: 24 Aug 2026. Spaced weekly.
  const anithaLastPaymentDate = new Date('2026-08-24T09:15:00.000Z');
  for (let i = 0; i < 20; i++) {
    const paymentDate = new Date(anithaLastPaymentDate.getTime());
    paymentDate.setDate(anithaLastPaymentDate.getDate() - i * 7);
    
    const id = `pay-anitha-${20 - i}`;
    const receiptId = `rec-anitha-${20 - i}`;
    const dateStr = paymentDate.toISOString();
    const method: 'Bank Transfer' | 'UPI' = i % 2 === 0 ? 'Bank Transfer' : 'UPI';
    
    payments.push({
      id,
      customerId: 'cust-3',
      customerName: 'Anitha R',
      amount: 2000,
      date: dateStr,
      method,
      receiptId,
      schemeName: 'Gold Weekly 1L',
    });

    receipts.push({
      id: receiptId,
      paymentId: id,
      receiptNumber: `REC-202608-${(300 + (20 - i)).toString().padStart(4, '0')}`,
      customerId: 'cust-3',
      customerName: 'Anitha R',
      date: dateStr,
      amount: 2000,
      method: method === 'Bank Transfer' ? 'Bank Transfer' : 'UPI payment',
      schemeName: 'Gold Weekly 1L',
      remainingBalance: 100000 - (20 - i) * 2000,
      referenceId: `REF${(765432100 + (20 - i)).toString()}`,
    });
  }

  // Sort payments and receipts chronologically (newest first)
  payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  receipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { payments, receipts };
};

const generatedData = generatePaymentsAndReceipts();
export const INITIAL_PAYMENTS: Payment[] = generatedData.payments;
export const INITIAL_RECEIPTS: Receipt[] = generatedData.receipts;

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Ravi Kumar',
    phone: '9876543210',
    pin: '1234',
    schemeId: 'scheme-1',
    amountGiven: 50000,
    collectionAmount: 1000,
    frequency: 'every_3_days',
    startDate: '2026-05-15T00:00:00.000Z',
    // Last payment was Aug 25, 2026. Next would be Aug 28, 2026.
    nextPaymentDate: '2026-08-28T10:00:00.000Z',
    email: 'ravi.kumar@gmail.com',
    address: '42, North Mada Street, Mylapore',
    city: 'Chennai',
    pincode: '600004',
    occupation: 'Retail Business Owner',
    nomineeName: 'Sita Kumar',
    nomineeRelation: 'Spouse',
    idProofType: 'Aadhaar',
    idProofNumber: 'XXXX-XXXX-4821',
  },
  {
    id: 'cust-2',
    name: 'Priya S',
    phone: '9876543211',
    pin: '1234',
    schemeId: 'scheme-2',
    amountGiven: 25000,
    collectionAmount: 500,
    frequency: 'daily',
    startDate: '2026-08-05T00:00:00.000Z',
    // Last payment was Aug 30, 2026. Next is Aug 31, 2026.
    nextPaymentDate: '2026-08-31T11:30:00.000Z',
    email: 'priya.s@outlook.com',
    address: '15/B, 2nd Avenue, Anna Nagar',
    city: 'Chennai',
    pincode: '600040',
    occupation: 'Software Engineer',
    nomineeName: 'Suresh K',
    nomineeRelation: 'Father',
    idProofType: 'PAN',
    idProofNumber: 'ABCPS1234F',
  },
  {
    id: 'cust-3',
    name: 'Anitha R',
    phone: '9876543212',
    pin: '1234',
    schemeId: 'scheme-3',
    amountGiven: 100000,
    collectionAmount: 2000,
    frequency: 'weekly',
    startDate: '2026-04-10T00:00:00.000Z',
    // Last payment was Aug 24, 2026. Next is Aug 31, 2026.
    nextPaymentDate: '2026-08-31T09:15:00.000Z',
    email: 'anitha.r@gmail.com',
    address: '78, Gandhi Road, T. Nagar',
    city: 'Chennai',
    pincode: '600017',
    occupation: 'Healthcare Consultant',
    nomineeName: 'Ramesh R',
    nomineeRelation: 'Spouse',
    idProofType: 'Aadhaar',
    idProofNumber: 'XXXX-XXXX-9142',
  },
];

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Customer, Payment, Scheme, Receipt, EnrolledScheme } from '../data/mockData';

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

// Local cache keys for offline tolerance and fallback
const CACHE_KEYS = {
  ADMINS: '@chitflow:cache:admins',
  CUSTOMERS: '@chitflow:cache:customers',
  SCHEMES: '@chitflow:cache:schemes',
  PAYMENTS: '@chitflow:cache:payments',
  RECEIPTS: '@chitflow:cache:receipts',
};

// ============================================================================
// Transformers: Database (snake_case) <--> App Domain (camelCase)
// ============================================================================
function mapAdminFromRow(row: any): AdminCredentials {
  return {
    username: row.username,
    password: row.password,
    name: row.name || '',
    businessName: row.business_name || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    city: row.city || '',
    pincode: row.pincode || '',
  };
}

function mapCustomerFromRow(row: any): Customer {
  const schemesList = Array.isArray(row.enrolled_schemes) ? row.enrolled_schemes : [];
  let totalAmt = Number(row.total_amount || row.amount_given || 0);
  let payoutAmt = Number(row.payout_amount || 0);
  let interestAmt = Number(row.interest_amount || 0);
  let colAmt = Number(row.collection_amount || 0);
  let dur = Number(row.duration_installments || 50);
  let freq = row.frequency || 'monthly';

  if (schemesList.length > 1) {
    // Sum across multiple loans/schemes
    totalAmt = schemesList.reduce((sum: number, s: any) => sum + (Number(s.totalAmount) || Number(s.amountGiven) || 0), 0);
    payoutAmt = schemesList.reduce((sum: number, s: any) => sum + (Number(s.payoutAmount) || 0), 0);
    interestAmt = schemesList.reduce((sum: number, s: any) => sum + (Number(s.interestAmount) || 0), 0);
    colAmt = schemesList.reduce((sum: number, s: any) => sum + (Number(s.collectionAmount) || 0), 0);
    freq = schemesList[schemesList.length - 1].frequency || freq;
  } else if (schemesList.length === 1) {
    const snapshot = schemesList[0];
    totalAmt = totalAmt || Number(snapshot.totalAmount || snapshot.amountGiven || 0);
    payoutAmt = payoutAmt || Number(snapshot.payoutAmount || 0);
    interestAmt = interestAmt || Number(snapshot.interestAmount || 0);
    colAmt = colAmt || Number(snapshot.collectionAmount || 0);
    dur = dur || Number(snapshot.durationInstallments || snapshot.durationWeeksOrMonths || 50);
    freq = snapshot.frequency || freq;
  }

  const intRate = payoutAmt > 0 ? (interestAmt / payoutAmt) * 100 : Number(row.interest_rate || 0);

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    pin: row.pin,
    schemeId: row.scheme_id || '',
    amountGiven: totalAmt,
    totalAmount: totalAmt,
    payoutAmount: payoutAmt || Math.max(0, totalAmt - interestAmt),
    interestAmount: interestAmt,
    interestRate: intRate,
    collectionAmount: colAmt,
    durationInstallments: dur,
    frequency: freq,
    startDate: row.start_date || new Date().toISOString(),
    nextPaymentDate: row.next_payment_date || new Date().toISOString(),
    email: row.email || '',
    address: row.address || '',
    city: row.city || '',
    pincode: row.pincode || '',
    occupation: row.occupation || '',
    nomineeName: row.nominee_name || '',
    nomineeRelation: row.nominee_relation || '',
    idProofType: row.id_proof_type || 'Aadhaar',
    idProofNumber: row.id_proof_number || '',
    enrolledSchemeIds: Array.isArray(row.enrolled_scheme_ids) ? row.enrolled_scheme_ids : [],
    enrolledSchemes: schemesList,
  };
}

function mapSchemeFromRow(row: any): Scheme {
  return {
    id: row.id,
    name: row.name,
    totalAmount: Number(row.total_amount || 0),
    interestAmount: Number(row.interest_amount || 0),
    payoutAmount: Number(row.payout_amount || 0),
    collectionAmount: Number(row.collection_amount || 0),
    frequency: row.frequency,
    durationWeeksOrMonths: Number(row.duration_weeks_or_months || 0),
    description: row.description || '',
    startDate: row.start_date || new Date().toISOString(),
    status: row.status || 'active',
  };
}

function mapPaymentFromRow(row: any): Payment {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    amount: Number(row.amount || 0),
    date: row.date || new Date().toISOString(),
    method: row.method,
    receiptId: row.receipt_id,
    schemeName: row.scheme_name,
  };
}

function mapReceiptFromRow(row: any): Receipt {
  return {
    id: row.id,
    paymentId: row.payment_id,
    receiptNumber: row.receipt_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    date: row.date || new Date().toISOString(),
    amount: Number(row.amount || 0),
    method: row.method,
    schemeName: row.scheme_name,
    remainingBalance: Number(row.remaining_balance || 0),
    referenceId: row.reference_id,
  };
}

// ============================================================================
// Database Service Implementation
// ============================================================================
export const dbService = {
  // Check if centralized database is currently live
  isLive(): boolean {
    return isSupabaseConfigured();
  },

  // --------------------------------------------------------------------------
  // ADMINS
  // --------------------------------------------------------------------------
  async fetchAdmins(): Promise<AdminCredentials[]> {
    if (this.isLive()) {
      try {
        const { data, error } = await supabase.from('admins').select('*');
        if (error) throw error;
        const list = (data || []).map(mapAdminFromRow);
        await AsyncStorage.setItem(CACHE_KEYS.ADMINS, JSON.stringify(list));
        return list;
      } catch (err) {
        console.warn('Supabase fetchAdmins error, falling back to cache:', err);
      }
    }
    const cached = await AsyncStorage.getItem(CACHE_KEYS.ADMINS);
    return cached ? JSON.parse(cached) : [];
  },

  async registerAdmin(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const cleanUser = username.trim();
    if (this.isLive()) {
      try {
        // Check uniqueness
        const { data: existing } = await supabase
          .from('admins')
          .select('username')
          .ilike('username', cleanUser)
          .single();

        if (existing) {
          return { success: false, error: 'Username is already registered on the central database' };
        }

        const { error } = await supabase.from('admins').insert({
          username: cleanUser,
          password,
        });

        if (error) throw error;
        // Sync cache
        await this.fetchAdmins();
        return { success: true };
      } catch (err: any) {
        console.error('Supabase registerAdmin error:', err);
        return { success: false, error: err?.message || 'Database registration failed' };
      }
    }

    // Offline / Local fallback
    const admins = await this.fetchAdmins();
    if (admins.some((a) => a.username.toLowerCase() === cleanUser.toLowerCase())) {
      return { success: false, error: 'Username is already registered' };
    }
    const updated = [...admins, { username: cleanUser, password }];
    await AsyncStorage.setItem(CACHE_KEYS.ADMINS, JSON.stringify(updated));
    return { success: true };
  },

  async loginAdmin(
    username: string,
    password: string
  ): Promise<{ success: boolean; admin?: AdminCredentials; error?: string }> {
    const cleanUser = username.trim();
    if (this.isLive()) {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .ilike('username', cleanUser)
          .single();

        if (error || !data) {
          return { success: false, error: 'Admin username not found in centralized database' };
        }

        if (data.password !== password) {
          return { success: false, error: 'Incorrect password' };
        }

        return { success: true, admin: mapAdminFromRow(data) };
      } catch (err: any) {
        console.warn('Supabase loginAdmin error, checking local cache:', err);
      }
    }

    const admins = await this.fetchAdmins();
    const found = admins.find(
      (a) => a.username.toLowerCase() === cleanUser.toLowerCase() && a.password === password
    );
    if (!found) {
      return { success: false, error: 'Invalid username or password' };
    }
    return { success: true, admin: found };
  },

  async updateAdminProfile(
    username: string,
    updatedData: Partial<AdminCredentials>
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isLive()) {
      try {
        const rowUpdates: any = {};
        if (updatedData.name !== undefined) rowUpdates.name = updatedData.name;
        if (updatedData.businessName !== undefined) rowUpdates.business_name = updatedData.businessName;
        if (updatedData.phone !== undefined) rowUpdates.phone = updatedData.phone;
        if (updatedData.email !== undefined) rowUpdates.email = updatedData.email;
        if (updatedData.address !== undefined) rowUpdates.address = updatedData.address;
        if (updatedData.city !== undefined) rowUpdates.city = updatedData.city;
        if (updatedData.pincode !== undefined) rowUpdates.pincode = updatedData.pincode;
        if (updatedData.password !== undefined) rowUpdates.password = updatedData.password;

        const { error } = await supabase
          .from('admins')
          .update(rowUpdates)
          .ilike('username', username.trim());

        if (error) throw error;
        await this.fetchAdmins();
        return { success: true };
      } catch (err: any) {
        console.error('Supabase updateAdminProfile error:', err);
        return { success: false, error: err?.message || 'Failed to update profile' };
      }
    }

    const admins = await this.fetchAdmins();
    const updated = admins.map((a) =>
      a.username.toLowerCase() === username.toLowerCase() ? { ...a, ...updatedData } : a
    );
    await AsyncStorage.setItem(CACHE_KEYS.ADMINS, JSON.stringify(updated));
    return { success: true };
  },

  // --------------------------------------------------------------------------
  // CUSTOMERS
  // --------------------------------------------------------------------------
  async fetchCustomers(): Promise<Customer[]> {
    if (this.isLive()) {
      try {
        const { data, error } = await supabase.from('customers').select('*');
        if (error) throw error;
        const list = (data || []).map(mapCustomerFromRow);
        await AsyncStorage.setItem(CACHE_KEYS.CUSTOMERS, JSON.stringify(list));
        return list;
      } catch (err) {
        console.warn('Supabase fetchCustomers error, falling back to cache:', err);
      }
    }
    const cached = await AsyncStorage.getItem(CACHE_KEYS.CUSTOMERS);
    return cached ? JSON.parse(cached) : [];
  },

  async registerCustomer(customer: Customer): Promise<{ success: boolean; error?: string }> {
    if (this.isLive()) {
      try {
        // Check phone uniqueness with maybeSingle
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', customer.phone.trim())
          .maybeSingle();

        if (existing) {
          return { success: false, error: 'Phone number is already registered in central database' };
        }

        const totAmt = customer.totalAmount || customer.amountGiven || 0;
        const snapshot = {
          totalAmount: totAmt,
          payoutAmount: customer.payoutAmount || 0,
          interestAmount: customer.interestAmount || 0,
          interestRate: customer.interestRate || 0,
          durationInstallments: customer.durationInstallments || 50,
          collectionAmount: customer.collectionAmount || 0,
          frequency: customer.frequency || 'daily',
        };

        const payloadWithAllCols: any = {
          id: customer.id,
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          pin: customer.pin.trim(),
          scheme_id: customer.schemeId || '',
          amount_given: totAmt,
          total_amount: totAmt,
          payout_amount: customer.payoutAmount || 0,
          interest_amount: customer.interestAmount || 0,
          interest_rate: customer.interestRate || 0,
          collection_amount: customer.collectionAmount || 0,
          duration_installments: customer.durationInstallments || 50,
          frequency: customer.frequency || 'monthly',
          start_date: customer.startDate || new Date().toISOString(),
          next_payment_date: customer.nextPaymentDate || null,
          email: customer.email || '',
          address: customer.address || '',
          city: customer.city || '',
          pincode: customer.pincode || '',
          occupation: customer.occupation || '',
          nominee_name: customer.nomineeName || '',
          nominee_relation: customer.nomineeRelation || '',
          id_proof_type: customer.idProofType || 'Aadhaar',
          id_proof_number: customer.idProofNumber || '',
          enrolled_scheme_ids: customer.enrolledSchemeIds || [],
          enrolled_schemes: customer.enrolledSchemes?.length ? customer.enrolledSchemes : [snapshot],
        };

        let { error } = await supabase.from('customers').insert(payloadWithAllCols);

        // If the Supabase database table hasn't run the ALTER TABLE migrations yet (PGRST204),
        // fallback gracefully by removing the new columns and persisting them inside enrolled_schemes JSONB!
        if (error && error.code === 'PGRST204') {
          console.warn('Supabase customers table lacks migration columns, falling back to standard columns + enrolled_schemes:', error.message);
          const fallbackPayload: any = { ...payloadWithAllCols };
          delete fallbackPayload.total_amount;
          delete fallbackPayload.payout_amount;
          delete fallbackPayload.interest_amount;
          delete fallbackPayload.interest_rate;
          delete fallbackPayload.duration_installments;
          const retry = await supabase.from('customers').insert(fallbackPayload);
          error = retry.error;
        }

        if (error) throw error;
        await this.fetchCustomers();
        return { success: true };
      } catch (err: any) {
        console.error('Supabase registerCustomer error:', err);
        return { success: false, error: err?.message || 'Failed to register member' };
      }
    }

    const customers = await this.fetchCustomers();
    if (customers.some((c) => c.phone.trim() === customer.phone.trim())) {
      return { success: false, error: 'Phone number is already registered' };
    }
    const updated = [...customers, customer];
    await AsyncStorage.setItem(CACHE_KEYS.CUSTOMERS, JSON.stringify(updated));
    return { success: true };
  },

  async loginCustomer(
    identifier: string,
    pin: string
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> {
    const cleanId = identifier.trim();
    if (this.isLive()) {
      try {
        // Query by Customer ID (id) OR Phone number
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or(`phone.eq.${cleanId},id.ilike.${cleanId}`)
          .maybeSingle();

        if (error || !data) {
          // Check if customer previously completed all installments and was closed
          try {
            const { data: pastPay } = await supabase
              .from('payments')
              .select('id')
              .or(`customer_id.ilike.${cleanId}`)
              .limit(1);
            if (pastPay && pastPay.length > 0) {
              return {
                success: false,
                error: 'All installment payments have been completed for this customer and the profile has been closed. Thank you!',
              };
            }
          } catch {
            // Ignore check error
          }
          return { success: false, error: 'Customer ID or Phone number not found in database' };
        }

        if (data.pin !== pin.trim()) {
          return { success: false, error: 'Incorrect 4-digit PIN' };
        }

        return { success: true, customer: mapCustomerFromRow(data) };
      } catch (err: any) {
        console.warn('Supabase loginCustomer error, checking local cache:', err);
      }
    }

    const customers = await this.fetchCustomers();
    const found = customers.find(
      (c) =>
        c.phone.trim() === cleanId ||
        c.id.toLowerCase() === cleanId.toLowerCase()
    );
    if (!found) {
      const pastPayments = await this.fetchPayments();
      const hasPastPay = pastPayments.some((p) => p.customerId.toLowerCase() === cleanId.toLowerCase());
      if (hasPastPay) {
        return {
          success: false,
          error: 'All installment payments have been completed for this customer and the profile has been closed. Thank you!',
        };
      }
      return { success: false, error: 'Customer ID or Phone number not found' };
    }
    if (found.pin !== pin.trim()) {
      return { success: false, error: 'Incorrect 4-digit PIN' };
    }
    return { success: true, customer: found };
  },

  async deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
    if (this.isLive()) {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', customerId);
        if (error) throw error;
        await this.fetchCustomers();
        return { success: true };
      } catch (err: any) {
        console.error('Supabase deleteCustomer error:', err);
        return { success: false, error: err?.message || 'Failed to delete customer' };
      }
    }

    const customers = await this.fetchCustomers();
    const updated = customers.filter((c) => c.id !== customerId);
    await AsyncStorage.setItem(CACHE_KEYS.CUSTOMERS, JSON.stringify(updated));
    return { success: true };
  },

  async updateCustomer(customerId: string, updatedData: Partial<Customer>): Promise<{ success: boolean; error?: string }> {
    if (this.isLive()) {
      try {
        const rowUpdates: any = {};
        if (updatedData.name !== undefined) rowUpdates.name = updatedData.name;
        if (updatedData.phone !== undefined) rowUpdates.phone = updatedData.phone;
        if (updatedData.pin !== undefined) rowUpdates.pin = updatedData.pin;
        if (updatedData.schemeId !== undefined) rowUpdates.scheme_id = updatedData.schemeId;
        if (updatedData.totalAmount !== undefined) {
          rowUpdates.total_amount = updatedData.totalAmount;
          rowUpdates.amount_given = updatedData.totalAmount;
        } else if (updatedData.amountGiven !== undefined) {
          rowUpdates.total_amount = updatedData.amountGiven;
          rowUpdates.amount_given = updatedData.amountGiven;
        }
        if (updatedData.payoutAmount !== undefined) rowUpdates.payout_amount = updatedData.payoutAmount;
        if (updatedData.interestAmount !== undefined) rowUpdates.interest_amount = updatedData.interestAmount;
        if (updatedData.interestRate !== undefined) rowUpdates.interest_rate = updatedData.interestRate;
        if (updatedData.collectionAmount !== undefined) rowUpdates.collection_amount = updatedData.collectionAmount;
        if (updatedData.durationInstallments !== undefined) rowUpdates.duration_installments = updatedData.durationInstallments;
        if (updatedData.frequency !== undefined) rowUpdates.frequency = updatedData.frequency;
        if (updatedData.nextPaymentDate !== undefined) rowUpdates.next_payment_date = updatedData.nextPaymentDate;
        if (updatedData.email !== undefined) rowUpdates.email = updatedData.email;
        if (updatedData.address !== undefined) rowUpdates.address = updatedData.address;
        if (updatedData.city !== undefined) rowUpdates.city = updatedData.city;
        if (updatedData.pincode !== undefined) rowUpdates.pincode = updatedData.pincode;
        if (updatedData.occupation !== undefined) rowUpdates.occupation = updatedData.occupation;
        if (updatedData.nomineeName !== undefined) rowUpdates.nominee_name = updatedData.nomineeName;
        if (updatedData.nomineeRelation !== undefined) rowUpdates.nominee_relation = updatedData.nomineeRelation;
        if (updatedData.idProofType !== undefined) rowUpdates.id_proof_type = updatedData.idProofType;
        if (updatedData.idProofNumber !== undefined) rowUpdates.id_proof_number = updatedData.idProofNumber;
        if (updatedData.enrolledSchemeIds !== undefined) rowUpdates.enrolled_scheme_ids = updatedData.enrolledSchemeIds;
        // If explicit enrolledSchemes array is provided, preserve all multi-loan records!
        if (updatedData.enrolledSchemes !== undefined) {
          rowUpdates.enrolled_schemes = updatedData.enrolledSchemes;
        } else if (
          updatedData.payoutAmount !== undefined ||
          updatedData.interestAmount !== undefined ||
          updatedData.totalAmount !== undefined ||
          updatedData.collectionAmount !== undefined ||
          updatedData.durationInstallments !== undefined
        ) {
          const snapshot = {
            totalAmount: updatedData.totalAmount || updatedData.amountGiven,
            payoutAmount: updatedData.payoutAmount,
            interestAmount: updatedData.interestAmount,
            interestRate: updatedData.interestRate,
            durationInstallments: updatedData.durationInstallments,
            collectionAmount: updatedData.collectionAmount,
            frequency: updatedData.frequency,
          };
          rowUpdates.enrolled_schemes = [snapshot];
        }

        let { error } = await supabase.from('customers').update(rowUpdates).eq('id', customerId);

        // Fallback for PGRST204 if columns are not present
        if (error && error.code === 'PGRST204') {
          console.warn('Supabase customers table lacks migration columns on update, falling back:', error.message);
          delete rowUpdates.total_amount;
          delete rowUpdates.payout_amount;
          delete rowUpdates.interest_amount;
          delete rowUpdates.interest_rate;
          delete rowUpdates.duration_installments;
          const retry = await supabase.from('customers').update(rowUpdates).eq('id', customerId);
          error = retry.error;
        }

        if (error) throw error;
        await this.fetchCustomers();
        return { success: true };
      } catch (err: any) {
        console.error('Supabase updateCustomer error:', err);
        return { success: false, error: err?.message || 'Failed to update customer' };
      }
    }

    const customers = await this.fetchCustomers();
    const updated = customers.map((c) => (c.id === customerId ? { ...c, ...updatedData } : c));
    await AsyncStorage.setItem(CACHE_KEYS.CUSTOMERS, JSON.stringify(updated));
    return { success: true };
  },

  // --------------------------------------------------------------------------
  // SCHEMES
  // --------------------------------------------------------------------------
  async fetchSchemes(): Promise<Scheme[]> {
    if (this.isLive()) {
      try {
        const { data, error } = await supabase.from('schemes').select('*').order('total_amount', { ascending: true });
        if (error) throw error;
        const list = (data || []).map(mapSchemeFromRow);
        await AsyncStorage.setItem(CACHE_KEYS.SCHEMES, JSON.stringify(list));
        return list;
      } catch (err) {
        console.warn('Supabase fetchSchemes error, falling back to cache:', err);
      }
    }
    const cached = await AsyncStorage.getItem(CACHE_KEYS.SCHEMES);
    return cached ? JSON.parse(cached) : [];
  },

  async saveScheme(scheme: Scheme): Promise<{ success: boolean; error?: string }> {
    if (this.isLive()) {
      try {
        const { error } = await supabase.from('schemes').upsert({
          id: scheme.id,
          name: scheme.name,
          total_amount: scheme.totalAmount,
          interest_amount: scheme.interestAmount || 0,
          payout_amount: scheme.payoutAmount,
          collection_amount: scheme.collectionAmount,
          frequency: scheme.frequency,
          duration_weeks_or_months: scheme.durationWeeksOrMonths,
          description: scheme.description || '',
          start_date: scheme.startDate || new Date().toISOString(),
          status: scheme.status || 'active',
        });
        if (error) throw error;
        await this.fetchSchemes();
        return { success: true };
      } catch (err: any) {
        console.error('Supabase saveScheme error:', err);
        return { success: false, error: err?.message || 'Failed to save scheme' };
      }
    }

    const schemes = await this.fetchSchemes();
    const existingIndex = schemes.findIndex((s) => s.id === scheme.id);
    const updated = existingIndex >= 0
      ? schemes.map((s) => (s.id === scheme.id ? scheme : s))
      : [...schemes, scheme];
    await AsyncStorage.setItem(CACHE_KEYS.SCHEMES, JSON.stringify(updated));
    return { success: true };
  },

  // --------------------------------------------------------------------------
  // PAYMENTS & RECEIPTS
  // --------------------------------------------------------------------------
  async fetchPayments(): Promise<Payment[]> {
    if (this.isLive()) {
      try {
        const { data, error } = await supabase.from('payments').select('*').order('date', { ascending: false });
        if (error) throw error;
        const list = (data || []).map(mapPaymentFromRow);
        await AsyncStorage.setItem(CACHE_KEYS.PAYMENTS, JSON.stringify(list));
        return list;
      } catch (err) {
        console.warn('Supabase fetchPayments error, falling back to cache:', err);
      }
    }
    const cached = await AsyncStorage.getItem(CACHE_KEYS.PAYMENTS);
    return cached ? JSON.parse(cached) : [];
  },

  async fetchReceipts(): Promise<Receipt[]> {
    if (this.isLive()) {
      try {
        const { data, error } = await supabase.from('receipts').select('*').order('date', { ascending: false });
        if (error) throw error;
        const list = (data || []).map(mapReceiptFromRow);
        await AsyncStorage.setItem(CACHE_KEYS.RECEIPTS, JSON.stringify(list));
        return list;
      } catch (err) {
        console.warn('Supabase fetchReceipts error, falling back to cache:', err);
      }
    }
    const cached = await AsyncStorage.getItem(CACHE_KEYS.RECEIPTS);
    return cached ? JSON.parse(cached) : [];
  },

  async recordPayment(
    payment: Payment,
    receipt: Receipt
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isLive()) {
      try {
        // Insert Payment
        const { error: payErr } = await supabase.from('payments').insert({
          id: payment.id,
          customer_id: payment.customerId,
          customer_name: payment.customerName,
          amount: payment.amount,
          date: payment.date,
          method: payment.method,
          receipt_id: payment.receiptId,
          scheme_name: payment.schemeName,
        });
        if (payErr) throw payErr;

        // Insert Receipt
        const { error: recErr } = await supabase.from('receipts').insert({
          id: receipt.id,
          payment_id: receipt.paymentId,
          receipt_number: receipt.receiptNumber,
          customer_id: receipt.customerId,
          customer_name: receipt.customerName,
          date: receipt.date,
          amount: receipt.amount,
          method: receipt.method,
          scheme_name: receipt.schemeName,
          remaining_balance: receipt.remainingBalance,
          reference_id: receipt.referenceId,
        });
        if (recErr) throw recErr;

        await this.fetchPayments();
        await this.fetchReceipts();
        return { success: true };
      } catch (err: any) {
        console.error('Supabase recordPayment error:', err);
        return { success: false, error: err?.message || 'Failed to record payment' };
      }
    }

    // Local fallback
    const payments = await this.fetchPayments();
    const receipts = await this.fetchReceipts();
    await AsyncStorage.setItem(CACHE_KEYS.PAYMENTS, JSON.stringify([payment, ...payments]));
    await AsyncStorage.setItem(CACHE_KEYS.RECEIPTS, JSON.stringify([receipt, ...receipts]));
    return { success: true };
  },
};

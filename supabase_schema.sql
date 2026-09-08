-- ============================================================================
-- ChitFlow Centralized Cloud Database Schema (Supabase / PostgreSQL)
-- Run this script in the Supabase SQL Editor (https://app.supabase.com -> Project -> SQL Editor)
-- ============================================================================

-- 1. Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create ADMINS Table
CREATE TABLE IF NOT EXISTS admins (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  name TEXT DEFAULT '',
  business_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create SCHEMES Table
CREATE TABLE IF NOT EXISTS schemes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  interest_amount NUMERIC DEFAULT 0,
  payout_amount NUMERIC NOT NULL,
  collection_amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  duration_weeks_or_months INTEGER NOT NULL,
  description TEXT DEFAULT '',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create CUSTOMERS Table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL,
  scheme_id TEXT DEFAULT '',
  amount_given NUMERIC DEFAULT 0,
  collection_amount NUMERIC DEFAULT 0,
  frequency TEXT DEFAULT 'monthly',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  next_payment_date TIMESTAMPTZ,
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  nominee_name TEXT DEFAULT '',
  nominee_relation TEXT DEFAULT '',
  id_proof_type TEXT DEFAULT 'Aadhaar',
  id_proof_number TEXT DEFAULT '',
  enrolled_scheme_ids JSONB DEFAULT '[]'::jsonb,
  enrolled_schemes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create PAYMENTS Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  method TEXT NOT NULL,
  receipt_id TEXT NOT NULL UNIQUE,
  scheme_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create RECEIPTS Table
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  remaining_balance NUMERIC DEFAULT 0,
  reference_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for High Performance Queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON receipts(receipt_number);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- Allow public access via Supabase anon key for seamless client app integration
-- ============================================================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Admins policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Public Access Admins') THEN
    CREATE POLICY "Public Access Admins" ON admins FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Schemes policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schemes' AND policyname = 'Public Access Schemes') THEN
    CREATE POLICY "Public Access Schemes" ON schemes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Customers policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Public Access Customers') THEN
    CREATE POLICY "Public Access Customers" ON customers FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Payments policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Public Access Payments') THEN
    CREATE POLICY "Public Access Payments" ON payments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Receipts policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'receipts' AND policyname = 'Public Access Receipts') THEN
    CREATE POLICY "Public Access Receipts" ON receipts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- Seed Initial Schemes Catalog (Bronze, Silver, Gold, Platinum)
-- ============================================================================
INSERT INTO schemes (id, name, total_amount, interest_amount, payout_amount, collection_amount, frequency, duration_weeks_or_months, description, start_date, status)
VALUES 
  (
    'scheme-1',
    'Bronze 3-Day 50K',
    50000,
    4000,
    46000,
    1000,
    'every_3_days',
    50,
    'Total Chit Value is ₹50,000. An upfront interest of ₹4,000 is deducted, giving the customer a net payout of ₹46,000. The customer repays ₹50,000 across 50 installments of ₹1,000 (every 3 days).',
    '2026-05-15T00:00:00.000Z',
    'active'
  ),
  (
    'scheme-2',
    'Silver Daily 25K',
    25000,
    2000,
    23000,
    500,
    'daily',
    50,
    'Total Chit Value is ₹25,000. An upfront interest of ₹2,000 is deducted, giving the customer a net payout of ₹23,000. The customer repays ₹25,000 across 50 daily installments of ₹500.',
    '2026-08-05T00:00:00.000Z',
    'active'
  ),
  (
    'scheme-3',
    'Gold Weekly 1L',
    100000,
    8000,
    92000,
    2000,
    'weekly',
    50,
    'Total Chit Value is ₹1,00,000. An upfront interest of ₹8,000 is deducted, giving the customer a net payout of ₹92,000. The customer repays ₹1,00,000 across 50 weekly installments of ₹2,000.',
    '2026-04-10T00:00:00.000Z',
    'active'
  ),
  (
    'scheme-4',
    'Platinum Monthly 2L',
    200000,
    15000,
    185000,
    5000,
    'monthly',
    40,
    'Total Chit Value is ₹2,00,000. An upfront interest of ₹15,000 is deducted, giving the customer a net payout of ₹1,85,000. The customer repays ₹2,00,000 across 40 monthly installments of ₹5,000.',
    '2026-01-15T00:00:00.000Z',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

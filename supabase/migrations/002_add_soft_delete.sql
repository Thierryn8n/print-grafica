-- Migration 002: Add Soft Delete
-- This migration adds deleted_at columns to main tables for soft delete functionality

-- Add deleted_at to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to order_files
ALTER TABLE order_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to digital_assets
ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update RLS policies to filter by deleted_at
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
CREATE POLICY "Authenticated users can view orders" 
  ON orders FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
CREATE POLICY "Authenticated users can view clients" 
  ON clients FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Authenticated users can view digital_assets" ON digital_assets;
CREATE POLICY "Authenticated users can view digital_assets" 
  ON digital_assets FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can view order files" ON order_files;
CREATE POLICY "Authenticated users can view order files" 
  ON order_files FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

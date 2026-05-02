/*
  # Fix recursive RLS between hotel_profiles and hotel_staff

  Problem: mutual recursion causing 500 errors for all authenticated users:
  - hotel_profiles policy "Hotel staff can view hotel profile" queries hotel_staff
  - hotel_staff policy "Hotel owners can view all staff" queries hotel_profiles
  = infinite loop → 500 on any authenticated request to hotel_profiles

  Fix:
  - Drop the recursive "Hotel staff can view hotel profile" policy on hotel_profiles
    (staff can already see hotels via "Anyone authenticated can view active hotels")
  - Replace "Hotel owners can view all staff" on hotel_staff with a direct user_id check
    using a security definer function to break the cycle
*/

-- Drop the policy that causes recursion on hotel_profiles
DROP POLICY IF EXISTS "Hotel staff can view hotel profile" ON hotel_profiles;

-- Fix hotel_staff: replace hotel_profiles subquery with direct join-free check
DROP POLICY IF EXISTS "Hotel owners can view all staff" ON hotel_staff;

-- Use a security definer function to get hotel_ids owned by current user
-- This runs outside RLS context, breaking the recursion
CREATE OR REPLACE FUNCTION get_owned_hotel_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM hotel_profiles WHERE user_id = auth.uid();
$$;

CREATE POLICY "Hotel owners can view all staff"
  ON hotel_staff FOR SELECT
  TO authenticated
  USING (hotel_id IN (SELECT get_owned_hotel_ids()));

-- Also fix hotel_staff UPDATE policy that has same recursion
DROP POLICY IF EXISTS "Hotel owners can update staff" ON hotel_staff;
CREATE POLICY "Hotel owners can update staff"
  ON hotel_staff FOR UPDATE
  TO authenticated
  USING (hotel_id IN (SELECT get_owned_hotel_ids()))
  WITH CHECK (hotel_id IN (SELECT get_owned_hotel_ids()));

/*
  # Fix infinite recursion in RLS policies

  ## Problem
  Two tables had policies that queried themselves:
  1. `profiles` - "Admins can view all profiles" did SELECT FROM profiles inside profiles policy
  2. `hotel_staff` - "Staff can view members of their hotel" did SELECT FROM hotel_staff inside hotel_staff policy

  ## Fix
  - Replace self-referencing policies with non-recursive equivalents
  - Admin check on profiles uses auth.jwt() app_metadata instead of querying profiles
  - hotel_staff policy uses direct user_id = auth.uid() check instead of subquery into itself
*/

-- Fix profiles: remove recursive admin policy and replace with jwt-based check
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR auth.uid() = id
  );

-- Fix hotel_staff: the "Staff can view members of their hotel" policy is self-referencing
-- Replace it so each staff member can see their own record directly, 
-- and hotel owners (via hotel_profiles) can see all staff
DROP POLICY IF EXISTS "Staff can view members of their hotel" ON hotel_staff;

CREATE POLICY "Staff can view their own record"
  ON hotel_staff FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Hotel owners can view all staff for their hotel (hotel_profiles is not recursive)
-- "Hotel owners can view all staff" policy already exists and is fine - keep it

-- Also fix hotel_profiles "Hotel staff can view hotel profile" - it queries hotel_staff which has recursion
-- hotel_staff policies are now fixed so this should be fine, but let's also ensure
-- the public listing of hotels works without auth issues by adding anon select for active hotels
DROP POLICY IF EXISTS "Anyone can view active hotels" ON hotel_profiles;

CREATE POLICY "Anyone can view active hotels"
  ON hotel_profiles FOR SELECT
  USING (is_active = true);

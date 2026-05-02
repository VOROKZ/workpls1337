/*
  # Fix hotel_staff INSERT/UPDATE policies that reference hotel_staff recursively

  The "Hotel owners can add staff" and "Hotel owners can update staff" policies
  both query hotel_staff from within hotel_staff policies, causing recursion.
  
  Fix: rely only on hotel_profiles ownership check (hotel_profiles is not recursive).
  Staff managers adding other staff is a secondary use case — owners via hotel_profiles 
  is the primary path and avoids recursion entirely.
*/

DROP POLICY IF EXISTS "Hotel owners can add staff" ON hotel_staff;
DROP POLICY IF EXISTS "Hotel owners can update staff" ON hotel_staff;

CREATE POLICY "Hotel owners can add staff"
  ON hotel_staff FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Hotel owners can update staff"
  ON hotel_staff FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_staff.hotel_id AND hp.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_staff.hotel_id AND hp.user_id = auth.uid())
  );

-- Fix "Admins can view all staff" - it queries profiles which could be slow but not recursive
-- It's fine as-is since profiles policies don't reference hotel_staff

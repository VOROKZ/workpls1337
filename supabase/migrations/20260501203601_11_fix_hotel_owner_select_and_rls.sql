/*
  # Fix hotel owner SELECT and missing RLS policies

  Problems:
  1. Hotel owner cannot load their own hotelProfile because there's no policy
     allowing SELECT WHERE user_id = auth.uid() (only active hotels are visible,
     but a new hotel might not have is_active=true or the owner needs to see their own record)
  2. influencer_profiles: owner cannot SELECT their own row (needed for authStore)
  3. tourist_profiles: ensure owner can always SELECT their own row
*/

-- Hotel owner can always view their own profile (regardless of is_active)
DROP POLICY IF EXISTS "Hotel owner can view own profile" ON hotel_profiles;
CREATE POLICY "Hotel owner can view own profile"
  ON hotel_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Influencer can view their own profile
DROP POLICY IF EXISTS "Influencer can view own profile" ON influencer_profiles;
CREATE POLICY "Influencer can view own profile"
  ON influencer_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Tourist can always view own profile (already exists but make sure)
DROP POLICY IF EXISTS "Tourists can view own profile" ON tourist_profiles;
CREATE POLICY "Tourists can view own profile"
  ON tourist_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

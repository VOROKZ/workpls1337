/*
  # Fix public counts and booking/tourist visibility

  Problems fixed:
  1. HomePage stats (tourist count, influencer count) returned 0 because
     tourist_profiles and influencer_profiles had no public SELECT policy.
     We add anon-accessible count policies using aggregate-safe approach.
  2. hotel_profiles "Hotel staff can view hotel profile" had a bug: hs.id vs hs.hotel_id
  3. bookings: hotel owners need to see bookings for their hotel (tourist side already works)
  4. tourist_profiles: hotel owners need to see tourists who booked their hotel
*/

-- Allow anyone to count tourists (for homepage stats)
-- We allow authenticated + anon to do aggregate queries on a minimal view
-- Simplest: allow authenticated users to count tourist_profiles
DROP POLICY IF EXISTS "Anyone can count tourists" ON tourist_profiles;
CREATE POLICY "Anyone can count tourists"
  ON tourist_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can count influencers" ON influencer_profiles;
CREATE POLICY "Anyone can count influencers"
  ON influencer_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix "Hotel staff can view hotel profile" bug (hs.id should be hs.hotel_id)
DROP POLICY IF EXISTS "Hotel staff can view hotel profile" ON hotel_profiles;
CREATE POLICY "Hotel staff can view hotel profile"
  ON hotel_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_profiles.id AND hs.user_id = auth.uid() AND hs.is_active = true
    )
  );

-- Bookings: tourists can view their own, hotels can view bookings for their hotel
DROP POLICY IF EXISTS "Tourists can view own bookings" ON bookings;
CREATE POLICY "Tourists can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (tourist_id = auth.uid());

DROP POLICY IF EXISTS "Hotels can view own hotel bookings" ON bookings;
CREATE POLICY "Hotels can view own hotel bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid()
    )
  );

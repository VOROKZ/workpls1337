/*
  # HotelHub - Users, Profiles, and Roles

  ## Overview
  Creates the core user system with role-based access:
  - profiles: extended user data linked to auth.users
  - tourist_profiles: tourist-specific data
  - hotel_profiles: hotel registration data
  - influencer_profiles: influencer portfolio and stats

  ## Roles
  - tourist: traveler who books hotels
  - hotel: hotel owner/admin
  - influencer: content creator with referral program
  - admin: platform super admin
  - hotel_staff: hotel employee (managed via hotel_staff table)

  ## Security
  - RLS enabled on all tables
  - Users can only read/update their own profile
  - Admins can read all profiles
*/

-- Core profiles table extending auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'tourist' CHECK (role IN ('tourist', 'hotel', 'influencer', 'admin', 'hotel_staff')),
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Tourist profiles
CREATE TABLE IF NOT EXISTS tourist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  date_of_birth date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tourist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tourists can view own profile"
  ON tourist_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tourist profiles"
  ON tourist_profiles FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Tourists can insert own profile"
  ON tourist_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tourists can update own profile"
  ON tourist_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Influencer profiles
CREATE TABLE IF NOT EXISTS influencer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  instagram_url text,
  telegram_url text,
  followers_count integer DEFAULT 0,
  bio text,
  portfolio_text text,
  points_balance integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE influencer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can view own profile"
  ON influencer_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone authenticated can view influencer profiles"
  ON influencer_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Influencers can insert own profile"
  ON influencer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Influencers can update own profile"
  ON influencer_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Points history for influencers
CREATE TABLE IF NOT EXISTS points_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'spent')),
  source text NOT NULL,
  booking_id uuid,
  hotel_id uuid,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can view own points history"
  ON points_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all points history"
  ON points_history FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "System can insert points history"
  ON points_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

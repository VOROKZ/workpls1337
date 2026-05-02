/*
  # HotelHub - Bookings and Referral System

  ## Overview
  - bookings: reservation records with pricing and status tracking
  - referral_links: unique links per influencer per hotel
  - referral_clicks: tracking page visits via referral links
  - promo_codes: discount codes created by hotels

  ## Notes
  - Referral system awards 100 points per completed booking
  - Influencer gets unique link per hotel
  - Booking tracks source referral for analytics

  ## Security
  - Tourists can see own bookings
  - Hotels can see bookings for their properties
  - Influencers can see bookings from their referral links
*/

-- Referral links
CREATE TABLE IF NOT EXISTS referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  discount_percent integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  conversions_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(influencer_id, hotel_id)
);

ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can view own referral links"
  ON referral_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Hotels can view referral links for their hotel"
  ON referral_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all referral links"
  ON referral_links FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Influencers can create referral links"
  ON referral_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Influencers can update own referral links"
  ON referral_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

-- Referral clicks tracking
CREATE TABLE IF NOT EXISTS referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id uuid NOT NULL REFERENCES referral_links(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  tourist_id uuid REFERENCES profiles(id),
  converted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can view own referral clicks"
  ON referral_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM referral_links rl
      JOIN influencer_profiles ip ON ip.id = rl.influencer_id
      WHERE rl.id = referral_link_id AND ip.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert referral clicks"
  ON referral_clicks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  max_uses integer,
  uses_count integer DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(hotel_id, code)
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Hotels can manage own promo codes"
  ON promo_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Hotels can update own promo codes"
  ON promo_codes FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid()));

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id),
  room_id uuid NOT NULL REFERENCES rooms(id),
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  guests_count integer DEFAULT 1,
  nights integer GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  base_price_per_night numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  discount_amount numeric(10,2) DEFAULT 0,
  final_price numeric(10,2) NOT NULL,
  referral_link_id uuid REFERENCES referral_links(id),
  promo_code_id uuid REFERENCES promo_codes(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  tourist_first_name text NOT NULL,
  tourist_last_name text NOT NULL,
  tourist_phone text,
  special_requests text,
  points_awarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tourists can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = tourist_id);

CREATE POLICY "Hotels can view bookings for their property"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Tourists can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tourist_id);

CREATE POLICY "Hotels and tourists can update booking status"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = tourist_id OR
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = tourist_id OR
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

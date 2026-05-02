/*
  # HotelHub - Hotels, Rooms, and Amenities

  ## Overview
  - hotel_profiles: hotel registration and profile data
  - hotel_amenities: list of amenities per hotel
  - hotel_photos: photo gallery per hotel
  - rooms: room types and details per hotel
  - room_availability: date-based availability calendar
  - hotel_reviews: tourist reviews of hotels

  ## Security
  - Hotels can only manage their own data
  - Tourists can read hotel data
  - RLS on all tables
*/

-- Hotel profiles
CREATE TABLE IF NOT EXISTS hotel_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  description text,
  rating numeric(3,2) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  stars integer DEFAULT 3 CHECK (stars BETWEEN 1 AND 5),
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_active boolean DEFAULT true,
  accepts_points boolean DEFAULT false,
  base_discount_percent integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active hotels"
  ON hotel_profiles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Hotels can insert own profile"
  ON hotel_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hotels can update own profile"
  ON hotel_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all hotels"
  ON hotel_profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Hotel photos
CREATE TABLE IF NOT EXISTS hotel_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  is_cover boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view hotel photos"
  ON hotel_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hotel owners can manage own photos"
  ON hotel_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Hotel owners can delete own photos"
  ON hotel_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

-- Hotel amenities
CREATE TABLE IF NOT EXISTS hotel_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view amenities"
  ON hotel_amenities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hotel owners can manage amenities"
  ON hotel_amenities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Hotel owners can delete amenities"
  ON hotel_amenities FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('standard', 'deluxe', 'suite', 'economy', 'family', 'presidential')),
  description text,
  price_per_night numeric(10,2) NOT NULL,
  max_guests integer DEFAULT 2,
  area_sqm integer,
  floor integer,
  amenities text[] DEFAULT '{}',
  photos text[] DEFAULT '{}',
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view available rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (is_available = true);

CREATE POLICY "Hotel owners can view all own rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Hotel owners can manage rooms"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Hotel owners can update rooms"
  ON rooms FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid()));

CREATE POLICY "Hotel owners can delete rooms"
  ON rooms FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

-- Room availability
CREATE TABLE IF NOT EXISTS room_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_available boolean DEFAULT true,
  price_override numeric(10,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, date)
);

ALTER TABLE room_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view room availability"
  ON room_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hotel owners can manage room availability"
  ON room_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN hotel_profiles hp ON hp.id = r.hotel_id
      WHERE r.id = room_id AND hp.user_id = auth.uid()
    )
  );

CREATE POLICY "Hotel owners can update room availability"
  ON room_availability FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN hotel_profiles hp ON hp.id = r.hotel_id
      WHERE r.id = room_id AND hp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN hotel_profiles hp ON hp.id = r.hotel_id
      WHERE r.id = room_id AND hp.user_id = auth.uid()
    )
  );

-- Hotel reviews
CREATE TABLE IF NOT EXISTS hotel_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  tourist_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id uuid,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  content text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view approved reviews"
  ON hotel_reviews FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Tourists can insert own reviews"
  ON hotel_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = tourist_id);

CREATE POLICY "Admins can manage reviews"
  ON hotel_reviews FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

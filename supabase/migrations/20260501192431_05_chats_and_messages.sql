/*
  # HotelHub - Chat System

  ## Overview
  - hotel_chats: general public chat per hotel (all guests and staff)
  - hotel_chat_messages: messages in hotel public chat
  - direct_messages: private messages between users
  - lonely_tourist_chat: city-based chat for solo travelers
  - lonely_tourist_messages: messages in the lonely tourist chat

  ## Notes
  - Hotel chat is moderated by hotel staff and platform admins
  - Lonely tourist chat is city-based
  - All chats are realtime via Supabase Realtime

  ## Security
  - Public hotel chat visible to all authenticated users
  - DMs visible only to participants
*/

-- Hotel public chats (one per hotel)
CREATE TABLE IF NOT EXISTS hotel_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid UNIQUE NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view hotel chats"
  ON hotel_chats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hotels can create own chat"
  ON hotel_chats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

-- Hotel chat messages
CREATE TABLE IF NOT EXISTS hotel_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES hotel_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_moderated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view hotel chat messages"
  ON hotel_chat_messages FOR SELECT
  TO authenticated
  USING (NOT is_moderated);

CREATE POLICY "Authenticated users can send messages"
  ON hotel_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can moderate messages"
  ON hotel_chat_messages FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Direct messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DMs"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send DMs"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark DMs as read"
  ON direct_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Lonely tourist city chats
CREATE TABLE IF NOT EXISTS lonely_tourist_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(city)
);

ALTER TABLE lonely_tourist_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view city chats"
  ON lonely_tourist_chats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can create city chat"
  ON lonely_tourist_chats FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Lonely tourist chat messages
CREATE TABLE IF NOT EXISTS lonely_tourist_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES lonely_tourist_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  group_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lonely_tourist_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view lonely tourist messages"
  ON lonely_tourist_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send lonely tourist messages"
  ON lonely_tourist_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

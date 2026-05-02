/*
  # HotelHub - Hotel Staff and PMS System

  ## Overview
  - hotel_staff: staff records with roles and permissions
  - staff_action_logs: audit log of all staff actions
  - hotel_staff_chat: internal staff-only chat with channels
  - hotel_tasks: housekeeping and maintenance task management

  ## Staff Roles
  - owner: full access, can manage staff
  - manager: booking management, add staff (not owner), reports
  - receptionist: check-in/check-out, bookings view
  - cleaner: view room assignments, mark cleaned
  - maintenance: view/respond to repair requests

  ## Security
  - Staff can only see data for their hotel
  - Role-based access control enforced via RLS
*/

-- Hotel staff table
CREATE TABLE IF NOT EXISTS hotel_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_hotel text NOT NULL DEFAULT 'receptionist' CHECK (role_in_hotel IN ('owner', 'manager', 'receptionist', 'cleaner', 'maintenance')),
  is_active boolean DEFAULT true,
  invited_by uuid REFERENCES profiles(id),
  hire_date date DEFAULT CURRENT_DATE,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hotel_id, user_id)
);

ALTER TABLE hotel_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view members of their hotel"
  ON hotel_staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff hs2
      WHERE hs2.hotel_id = hotel_staff.hotel_id AND hs2.user_id = auth.uid() AND hs2.is_active = true
    )
  );

CREATE POLICY "Hotel owners can view all staff"
  ON hotel_staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all staff"
  ON hotel_staff FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Hotel owners can add staff"
  ON hotel_staff FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.role_in_hotel IN ('owner', 'manager') AND hs.is_active = true
    )
  );

CREATE POLICY "Hotel owners can update staff"
  ON hotel_staff FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.role_in_hotel = 'owner' AND hs.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.role_in_hotel = 'owner' AND hs.is_active = true
    )
  );

-- Staff action logs
CREATE TABLE IF NOT EXISTS staff_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES hotel_staff(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view logs for their hotel"
  ON staff_action_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.is_active = true
      AND hs.role_in_hotel IN ('owner', 'manager')
    )
    OR EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "System can insert action logs"
  ON staff_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.id = staff_id AND hs.user_id = auth.uid()
    )
  );

-- Hotel staff internal chat
CREATE TABLE IF NOT EXISTS hotel_staff_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_announcement boolean DEFAULT false,
  channel text DEFAULT 'general' CHECK (channel IN ('general', 'housekeeping', 'maintenance', 'announcements')),
  mentions uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_staff_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view messages for their hotel"
  ON hotel_staff_chat FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.is_active = true
    )
    OR EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Staff can send messages in their hotel chat"
  ON hotel_staff_chat FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM hotel_staff hs
        WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.is_active = true
      )
      OR EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
    )
  );

-- Hotel tasks (housekeeping and maintenance)
CREATE TABLE IF NOT EXISTS hotel_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  room_id uuid REFERENCES rooms(id),
  task_type text NOT NULL CHECK (task_type IN ('housekeeping', 'maintenance', 'inspection')),
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by uuid NOT NULL REFERENCES hotel_staff(id),
  assigned_to uuid REFERENCES hotel_staff(id),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tasks for their hotel"
  ON hotel_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.is_active = true
    )
    OR EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Staff can create tasks"
  ON hotel_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.is_active = true AND hs.id = created_by
    )
    OR EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Staff can update tasks for their hotel"
  ON hotel_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.is_active = true
    )
    OR EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.is_active = true
    )
    OR EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

-- Now add the hotel staff select policy to bookings that was deferred
CREATE POLICY "Hotel staff can view bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = hotel_id AND hs.user_id = auth.uid() AND hs.is_active = true
    )
  );

-- Add hotel staff select policy to hotel_profiles
CREATE POLICY "Hotel staff can view hotel profile"
  ON hotel_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotel_staff hs
      WHERE hs.hotel_id = id AND hs.user_id = auth.uid() AND hs.is_active = true
    )
  );

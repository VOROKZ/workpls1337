/*
  # Add is_verified field to hotel_profiles

  Adds a verification flag for admin moderation.
  
  Changes:
  - hotel_profiles: add is_verified BOOLEAN DEFAULT FALSE
  
  This allows admins to mark hotels as verified in the admin panel.
  Verified hotels can display a verification badge to tourists.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_profiles' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE hotel_profiles ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
END $$;

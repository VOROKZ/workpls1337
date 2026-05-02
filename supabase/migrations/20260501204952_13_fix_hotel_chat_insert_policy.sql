/*
  # Fix hotel_chats INSERT policy

  Problem: only hotel owners can create a chat room, but tourists/influencers
  arrive first and try to create the chat → INSERT denied → chat = null → cannot send messages.

  Fix: allow any authenticated user to create a chat for a hotel (upsert pattern).
  The chat is identified by hotel_id, so duplicates are prevented by the unique constraint.
*/

DROP POLICY IF EXISTS "Hotels can create own chat" ON hotel_chats;

CREATE POLICY "Authenticated users can create hotel chat"
  ON hotel_chats FOR INSERT
  TO authenticated
  WITH CHECK (true);

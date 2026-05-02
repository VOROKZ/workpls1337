/*
  # Fix blog_posts RLS: allow tourist and hotel roles to view published posts

  ## Problem
  The existing SELECT policy "Anyone can view published blog posts" uses no role check,
  but in practice tourist and hotel users couldn't see posts on /blog because the
  policy wasn't granting access to authenticated users with those roles.

  ## Changes
  1. Drop the existing public SELECT policy
  2. Add a broad SELECT policy: any user (authenticated or anon) can read published posts
  3. Keeps influencer's own-posts SELECT policy intact
*/

-- Drop the overly narrow existing public policy and replace with a cleaner one
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON blog_posts;

-- Allow everyone (anon + authenticated) to read published posts
CREATE POLICY "Public can view published blog posts"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (is_published = true AND status = 'published');

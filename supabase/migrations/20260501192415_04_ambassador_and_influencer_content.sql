/*
  # HotelHub - Ambassador Program and Influencer Content

  ## Overview
  - ambassador_applications: influencer applications to hotels
  - influencer_reviews: content uploaded after hotel stays
  - blog_posts: influencer blog/channel posts
  - post_likes: reactions on blog posts
  - post_comments: comments on blog posts
  - influencer_subscriptions: following influencers

  ## Notes
  - Ambassador program: influencer applies -> hotel approves -> visit -> upload review
  - Blog posts are public and visible in the platform feed

  ## Security
  - Influencers manage own content
  - Hotels moderate reviews for their property
  - Anyone can read approved content
*/

-- Ambassador applications
CREATE TABLE IF NOT EXISTS ambassador_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  message text,
  hotel_response text,
  visit_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(influencer_id, hotel_id)
);

ALTER TABLE ambassador_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Influencers can view own applications"
  ON ambassador_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Hotels can view applications for their hotel"
  ON ambassador_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all applications"
  ON ambassador_applications FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Influencers can create applications"
  ON ambassador_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Hotels can update application status"
  ON ambassador_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

-- Influencer reviews (content uploaded after visit)
CREATE TABLE IF NOT EXISTS influencer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES hotel_profiles(id) ON DELETE CASCADE,
  application_id uuid REFERENCES ambassador_applications(id),
  title text NOT NULL,
  content text NOT NULL,
  photos text[] DEFAULT '{}',
  video_url text,
  visit_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  hotel_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE influencer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved influencer reviews"
  ON influencer_reviews FOR SELECT
  TO authenticated
  USING (status = 'approved');

CREATE POLICY "Influencers can view own reviews"
  ON influencer_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Hotels can view reviews for their hotel"
  ON influencer_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid())
  );

CREATE POLICY "Influencers can create reviews"
  ON influencer_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Influencers can update own reviews"
  ON influencer_reviews FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid()));

CREATE POLICY "Hotels can moderate reviews"
  ON influencer_reviews FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM hotel_profiles hp WHERE hp.id = hotel_id AND hp.user_id = auth.uid()));

-- Blog posts (influencer channel)
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  photos text[] DEFAULT '{}',
  video_url text,
  hotel_id uuid REFERENCES hotel_profiles(id),
  tags text[] DEFAULT '{}',
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  is_published boolean DEFAULT true,
  status text DEFAULT 'published' CHECK (status IN ('published', 'draft', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (is_published = true AND status = 'published');

CREATE POLICY "Influencers can view own blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Influencers can create blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid())
  );

CREATE POLICY "Influencers can update own blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM influencer_profiles ip WHERE ip.id = influencer_id AND ip.user_id = auth.uid()));

CREATE POLICY "Admins can moderate blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON post_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved comments"
  ON post_comments FOR SELECT
  TO authenticated
  USING (is_approved = true);

CREATE POLICY "Users can insert comments"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Influencer subscriptions
CREATE TABLE IF NOT EXISTS influencer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, influencer_id)
);

ALTER TABLE influencer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscriptions"
  ON influencer_subscriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can subscribe"
  ON influencer_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unsubscribe"
  ON influencer_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

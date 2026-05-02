export type UserRole = 'tourist' | 'hotel' | 'influencer' | 'admin' | 'hotel_staff'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type StaffRole = 'owner' | 'manager' | 'receptionist' | 'cleaner' | 'maintenance'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'completed'
export type TaskType = 'housekeeping' | 'maintenance' | 'inspection'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type RoomType = 'standard' | 'deluxe' | 'suite' | 'economy' | 'family' | 'presidential'

export interface Profile {
  id: string
  role: UserRole
  email: string
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TouristProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone: string | null
  date_of_birth: string | null
  created_at: string
  updated_at: string
}

export interface InfluencerProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  instagram_url: string | null
  telegram_url: string | null
  followers_count: number
  bio: string | null
  portfolio_text: string | null
  points_balance: number
  rating: number
  reviews_count: number
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface HotelProfile {
  id: string
  user_id: string
  name: string
  city: string
  address: string
  phone: string
  email: string
  description: string | null
  rating: number
  reviews_count: number
  stars: number
  latitude: number | null
  longitude: number | null
  is_active: boolean
  accepts_points: boolean
  base_discount_percent: number
  created_at: string
  updated_at: string
}

export interface HotelPhoto {
  id: string
  hotel_id: string
  url: string
  caption: string | null
  is_cover: boolean
  sort_order: number
  created_at: string
}

export interface HotelAmenity {
  id: string
  hotel_id: string
  name: string
  icon: string | null
  category: string
  created_at: string
}

export interface Room {
  id: string
  hotel_id: string
  name: string
  type: RoomType
  description: string | null
  price_per_night: number
  max_guests: number
  area_sqm: number | null
  floor: number | null
  amenities: string[]
  photos: string[]
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  tourist_id: string
  hotel_id: string
  room_id: string
  check_in_date: string
  check_out_date: string
  guests_count: number
  nights: number
  base_price_per_night: number
  total_price: number
  discount_amount: number
  final_price: number
  referral_link_id: string | null
  promo_code_id: string | null
  status: BookingStatus
  tourist_first_name: string
  tourist_last_name: string
  tourist_phone: string | null
  special_requests: string | null
  points_awarded: boolean
  created_at: string
  updated_at: string
}

export interface ReferralLink {
  id: string
  influencer_id: string
  hotel_id: string
  code: string
  discount_percent: number
  clicks_count: number
  conversions_count: number
  is_active: boolean
  created_at: string
}

export interface AmbassadorApplication {
  id: string
  influencer_id: string
  hotel_id: string
  status: ApplicationStatus
  message: string | null
  hotel_response: string | null
  visit_date: string | null
  created_at: string
  updated_at: string
}

export interface BlogPost {
  id: string
  influencer_id: string
  title: string
  content: string
  photos: string[]
  video_url: string | null
  hotel_id: string | null
  tags: string[]
  likes_count: number
  comments_count: number
  is_published: boolean
  status: 'published' | 'draft' | 'rejected'
  created_at: string
  updated_at: string
}

export interface HotelStaff {
  id: string
  hotel_id: string
  user_id: string
  role_in_hotel: StaffRole
  is_active: boolean
  invited_by: string | null
  hire_date: string
  permissions: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface HotelTask {
  id: string
  hotel_id: string
  room_id: string | null
  task_type: TaskType
  title: string
  description: string | null
  status: TaskStatus
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_by: string
  assigned_to: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HotelChatMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string
  is_moderated: boolean
  created_at: string
  sender?: Profile
}

export interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  is_read: boolean
  created_at: string
  sender?: Profile
}

export interface StaffChatMessage {
  id: string
  hotel_id: string
  sender_id: string
  message: string
  is_announcement: boolean
  channel: 'general' | 'housekeeping' | 'maintenance' | 'announcements'
  mentions: string[]
  created_at: string
  sender?: Profile
}

export interface PointsHistory {
  id: string
  influencer_id: string
  amount: number
  type: 'earned' | 'spent'
  source: string
  booking_id: string | null
  hotel_id: string | null
  description: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      tourist_profiles: { Row: TouristProfile; Insert: Partial<TouristProfile>; Update: Partial<TouristProfile> }
      influencer_profiles: { Row: InfluencerProfile; Insert: Partial<InfluencerProfile>; Update: Partial<InfluencerProfile> }
      hotel_profiles: { Row: HotelProfile; Insert: Partial<HotelProfile>; Update: Partial<HotelProfile> }
      rooms: { Row: Room; Insert: Partial<Room>; Update: Partial<Room> }
      bookings: { Row: Booking; Insert: Partial<Booking>; Update: Partial<Booking> }
      referral_links: { Row: ReferralLink; Insert: Partial<ReferralLink>; Update: Partial<ReferralLink> }
      hotel_staff: { Row: HotelStaff; Insert: Partial<HotelStaff>; Update: Partial<HotelStaff> }
      blog_posts: { Row: BlogPost; Insert: Partial<BlogPost>; Update: Partial<BlogPost> }
    }
  }
}

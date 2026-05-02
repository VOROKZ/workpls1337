import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile, TouristProfile, InfluencerProfile, HotelProfile, HotelStaff } from '@/lib/database.types'

interface AuthState {
  user: Profile | null
  touristProfile: TouristProfile | null
  influencerProfile: InfluencerProfile | null
  hotelProfile: HotelProfile | null
  staffRecords: HotelStaff[]
  loading: boolean
  initialized: boolean
  setUser: (user: Profile | null) => void
  setLoading: (loading: boolean) => void
  fetchProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  touristProfile: null,
  influencerProfile: null,
  hotelProfile: null,
  staffRecords: [],
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ user: null, loading: false, initialized: true })
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      set({ user: null, loading: false, initialized: true })
      return
    }

    set({ user: profile })

    if (profile.role === 'tourist') {
      const { data: tp } = await supabase
        .from('tourist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      set({ touristProfile: tp })
    } else if (profile.role === 'influencer') {
      const { data: ip } = await supabase
        .from('influencer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      set({ influencerProfile: ip })
    } else if (profile.role === 'hotel') {
      const { data: hp } = await supabase
        .from('hotel_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      set({ hotelProfile: hp })
    } else if (profile.role === 'hotel_staff') {
      const { data: sr } = await supabase
        .from('hotel_staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
      set({ staffRecords: sr ?? [] })
    }

    set({ loading: false, initialized: true })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({
      user: null,
      touristProfile: null,
      influencerProfile: null,
      hotelProfile: null,
      staffRecords: [],
    })
  },
}))

import { useAuthStore } from '@/store/authStore'
import TouristDashboard from './TouristDashboard'
import HotelDashboard from './HotelDashboard'
import InfluencerDashboard from './InfluencerDashboard'
import AdminDashboard from './AdminDashboard'
import StaffDashboard from './StaffDashboard'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardRouter() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!user) return null

  switch (user.role) {
    case 'tourist': return <TouristDashboard />
    case 'hotel': return <HotelDashboard />
    case 'influencer': return <InfluencerDashboard />
    case 'admin': return <AdminDashboard />
    case 'hotel_staff': return <StaffDashboard />
    default: return <TouristDashboard />
  }
}

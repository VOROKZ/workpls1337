import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'

// Eager-loaded critical pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import NotFoundPage from '@/pages/NotFoundPage'

// Lazy-loaded pages
const HomePage = lazy(() => import('@/pages/HomePage'))
const HotelsPage = lazy(() => import('@/pages/HotelsPage'))
const HotelDetailPage = lazy(() => import('@/pages/HotelDetailPage'))
const BookingPage = lazy(() => import('@/pages/BookingPage'))
const BlogFeedPage = lazy(() => import('@/pages/BlogFeedPage'))
const HotelChatPage = lazy(() => import('@/pages/ChatPage'))
const DashboardRouter = lazy(() => import('@/pages/dashboard/DashboardRouter'))
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'))
const StaffChatPage = lazy(() => import('@/pages/dashboard/StaffChatPage'))
const BlogNewPostPage = lazy(() => import('@/pages/dashboard/BlogNewPostPage'))
const BookingsPage = lazy(() => import('@/pages/dashboard/BookingsPage'))
const ChatsPage = lazy(() => import('@/pages/dashboard/ChatsPage'))
const RoomsManagePage = lazy(() => import('@/pages/dashboard/RoomsManagePage'))
const StaffManagePage = lazy(() => import('@/pages/dashboard/StaffManagePage'))
const HotelGuestsPage = lazy(() => import('@/pages/dashboard/HotelGuestsPage'))
const TasksPage = lazy(() => import('@/pages/dashboard/TasksPage'))

function PageLoader() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64" />
    </div>
  )
}

export function App() {
  const { fetchProfile, setUser } = useAuthStore()

  useEffect(() => {
    fetchProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      (async () => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchProfile()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      })()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          classNames: {
            toast: 'border border-border bg-card text-foreground shadow-lg',
            success: 'border-green-200',
            error: 'border-destructive/30',
          },
        }}
      />
      <Routes>
        {/* Auth pages - no layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Main layout pages */}
        <Route path="/" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <HomePage />
            </Suspense>
          </Layout>
        } />

        <Route path="/hotels" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <HotelsPage />
            </Suspense>
          </Layout>
        } />

        <Route path="/hotels/:id" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <HotelDetailPage />
            </Suspense>
          </Layout>
        } />

        <Route path="/hotels/:hotelId/chat" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute>
                <HotelChatPage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/booking" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute allowedRoles={['tourist']}>
                <BookingPage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/blog" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <BlogFeedPage />
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard/settings" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard/bookings" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute>
                <BookingsPage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard/chats" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute>
                <ChatsPage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard/rooms" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute allowedRoles={['hotel']}>
                <RoomsManagePage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard/staff" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute allowedRoles={['hotel']}>
                <StaffManagePage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard/guests" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute allowedRoles={['hotel']}>
                <HotelGuestsPage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard/tasks" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute allowedRoles={['hotel_staff']}>
                <TasksPage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard/staff-chat" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute allowedRoles={['hotel_staff']}>
                <StaffChatPage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        <Route path="/dashboard/blog/new" element={
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ProtectedRoute allowedRoles={['influencer']}>
                <BlogNewPostPage />
              </ProtectedRoute>
            </Suspense>
          </Layout>
        } />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

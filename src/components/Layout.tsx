import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Hotel, User, Star, Building2, LayoutDashboard, Calendar, MessageSquare,
  Settings, LogOut, Menu, ChevronDown, Shield, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

function getNavItems(role: string): NavItem[] {
  const base: NavItem[] = [
    { label: 'Главная', href: '/', icon: <Hotel className="w-4 h-4" /> },
  ]
  if (role === 'tourist') {
    return [
      ...base,
      { label: 'Мои бронирования', href: '/dashboard/bookings', icon: <Calendar className="w-4 h-4" /> },
      { label: 'Чаты', href: '/dashboard/chats', icon: <MessageSquare className="w-4 h-4" /> },
      { label: 'Профиль', href: '/dashboard', icon: <User className="w-4 h-4" /> },
    ]
  }
  if (role === 'hotel') {
    return [
      ...base,
      { label: 'Управление', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Номера', href: '/dashboard/rooms', icon: <Building2 className="w-4 h-4" /> },
      { label: 'Бронирования', href: '/dashboard/bookings', icon: <Calendar className="w-4 h-4" /> },
      { label: 'Гости', href: '/dashboard/guests', icon: <Users className="w-4 h-4" /> },
      { label: 'Сотрудники', href: '/dashboard/staff', icon: <Users className="w-4 h-4" /> },
      { label: 'Чаты', href: '/dashboard/chats', icon: <MessageSquare className="w-4 h-4" /> },
    ]
  }
  if (role === 'influencer') {
    return [
      ...base,
      { label: 'Кабинет', href: '/dashboard', icon: <Star className="w-4 h-4" /> },
      { label: 'Новый пост', href: '/dashboard/blog/new', icon: <LayoutDashboard className="w-4 h-4" /> },
    ]
  }
  if (role === 'admin') {
    return [
      ...base,
      { label: 'Панель админа', href: '/dashboard', icon: <Shield className="w-4 h-4" /> },
      { label: 'Бронирования', href: '/dashboard/bookings', icon: <Calendar className="w-4 h-4" /> },
    ]
  }
  if (role === 'hotel_staff') {
    return [
      { label: 'Мой рабочий стол', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Задания', href: '/dashboard/tasks', icon: <Calendar className="w-4 h-4" /> },
      { label: 'Чат сотрудников', href: '/dashboard/staff-chat', icon: <MessageSquare className="w-4 h-4" /> },
    ]
  }
  return base
}

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = user ? getNavItems(user.role) : [
    { label: 'Главная', href: '/', icon: <Hotel className="w-4 h-4" /> },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-background">
      <header className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled ? 'bg-background/95 backdrop-blur-sm shadow-sm border-b border-border' : 'bg-background border-b border-border'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Hotel className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">HotelHub</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    location.pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{user.full_name || user.email}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <div className="text-sm font-medium truncate">{user.full_name || 'Пользователь'}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 w-4 h-4" /> Кабинет
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings" className="cursor-pointer">
                        <Settings className="mr-2 w-4 h-4" /> Настройки
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                      <LogOut className="mr-2 w-4 h-4" /> Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Войти</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/register">Регистрация</Link>
                  </Button>
                </div>
              )}

              {/* Mobile menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden w-9 h-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 p-4 border-b border-border">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <Hotel className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <span className="font-bold text-lg">HotelHub</span>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                            location.pathname === item.href
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                    {user && (
                      <div className="p-4 border-t border-border">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Выйти
                        </button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="page-enter">
        {children}
      </main>
    </div>
  )
}

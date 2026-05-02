import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Hop as Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 page-enter">
      {/* SVG illustration */}
      <svg viewBox="0 0 200 200" className="w-48 h-48 mb-8 opacity-90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="80" width="120" height="90" rx="8" fill="oklch(0.933 0.028 68)" stroke="oklch(0.617 0.138 35.2)" strokeWidth="3"/>
        <rect x="55" y="110" width="20" height="25" rx="3" fill="oklch(0.617 0.138 35.2)" opacity="0.4"/>
        <rect x="90" y="110" width="20" height="25" rx="3" fill="oklch(0.617 0.138 35.2)" opacity="0.4"/>
        <rect x="125" y="110" width="20" height="25" rx="3" fill="oklch(0.617 0.138 35.2)" opacity="0.4"/>
        <polygon points="40,80 100,40 160,80" fill="oklch(0.617 0.138 35.2)" opacity="0.7"/>
        <circle cx="155" cy="95" r="20" fill="oklch(0.985 0.012 85)" stroke="oklch(0.617 0.138 35.2)" strokeWidth="2.5"/>
        <text x="149" y="101" fontFamily="sans-serif" fontSize="16" fill="oklch(0.617 0.138 35.2)" fontWeight="bold">?</text>
        <path d="M50 170 Q100 155 150 170" stroke="oklch(0.318 0.089 143)" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>

      <h1 className="text-6xl font-extrabold text-primary mb-2">404</h1>
      <h2 className="text-2xl font-bold text-foreground mb-3">Страница не найдена</h2>
      <p className="text-muted-foreground text-center max-w-sm mb-8">
        Кажется, этого отеля не существует. Давайте вернёмся на главную и найдём что-нибудь получше.
      </p>

      <Button asChild size="lg" className="group">
        <Link to="/">
          <Home className="mr-2 w-4 h-4 transition-transform group-hover:scale-110" />
          Вернуться на главную
        </Link>
      </Button>
    </div>
  )
}

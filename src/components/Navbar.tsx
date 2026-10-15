import { ShoppingBasket, Heart, User, Home, Compass, Layers, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';

interface NavLink {
  label: string;
  path: string;
  icon: typeof Home;
}

const navLinks: NavLink[] = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Discover', path: '/discover', icon: Compass },
  { label: 'Categories', path: '/categories', icon: Layers },
  { label: 'Saved', path: '/saved', icon: Heart },
  { label: 'Basket', path: '/basket', icon: ShoppingBasket },
  { label: 'Profile', path: '/profile', icon: User },
];

export function Navbar() {
  const { path, navigate } = useRouter();
  const { user, profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (linkPath: string) => {
    if (linkPath === '/') return path === '/' || path === '';
    return path.startsWith(linkPath);
  };

  const handleNavigate = (to: string) => {
    navigate(to);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop + mobile header */}
      <header className="sticky top-0 z-40 border-b border-mist bg-ivory/95 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <button
            onClick={() => handleNavigate('/')}
            aria-label="Protein Shortlist home"
            className="flex items-center gap-2.5 font-heading text-base font-extrabold tracking-tight text-aubergine sm:text-lg"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-aubergine text-white">
              <Layers size={17} />
            </span>
            <span>Protein Shortlist</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavigate(link.path)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive(link.path)
                      ? 'bg-lavender text-aubergine'
                      : 'text-slate hover:bg-white hover:text-aubergine'
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right: admin link + mobile menu toggle */}
          <div className="flex items-center gap-2">
            {profile?.is_admin && (
              <button
                onClick={() => handleNavigate('/admin')}
                className={`hidden rounded-lg px-3 py-2 text-sm font-medium transition-all md:inline-flex ${
                  isActive('/admin')
                    ? 'bg-lavender text-aubergine'
                    : 'text-slate hover:bg-white hover:text-aubergine'
                }`}
              >
                Admin
              </button>
            )}
            {user ? (
              <span className="hidden max-w-40 truncate text-xs font-medium text-slate md:inline">
                {profile?.display_name ?? user.email}
              </span>
            ) : null}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-aubergine hover:bg-lavender md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <nav className="border-t border-mist bg-ivory px-4 py-3 md:hidden">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavigate(link.path)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'bg-lavender text-aubergine'
                      : 'text-slate hover:bg-white'
                  }`}
                >
                  <Icon size={18} />
                  {link.label}
                </button>
              );
            })}
            {profile?.is_admin && (
              <button
                onClick={() => handleNavigate('/admin')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive('/admin')
                    ? 'bg-lavender text-aubergine'
                    : 'text-slate hover:bg-white'
                }`}
              >
                <Layers size={18} />
                Admin
              </button>
            )}
          </nav>
        )}
      </header>

      {/* Mobile bottom tab bar */}
      <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t border-mist bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        <div className="flex items-center justify-around px-1 py-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => handleNavigate(link.path)}
                className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-[9px] font-semibold transition-colors ${
                  isActive(link.path)
                    ? 'text-coral-ink'
                    : 'text-slate'
                }`}
              >
                <Icon size={20} />
                {link.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

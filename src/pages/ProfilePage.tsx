import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Heart, ShoppingBasket, LogOut, Mail, User as UserIcon, Shield } from 'lucide-react';

export function ProfilePage() {
  const { user, profile, signIn, signUp, signOut, loading } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, displayName);
        if (error) setError(error);
      } else {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-sm text-gray-400">Loading...</div>;

  // Not signed in — show auth form
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-md">
              <UserIcon size={26} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {isSignUp
                ? 'Save products, build your basket, and shortlist across devices.'
                : 'Sign in to access your saved products and basket.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSupabaseConfigured && (
              <div role="status" className="rounded-xl border border-mist bg-lavender/60 px-4 py-3 text-sm leading-relaxed text-aubergine">
                Account services are unavailable until the app is connected to its backend.
              </div>
            )}
            {isSignUp && (
              <div>
                <label className="ps-label">Display name</label>
                <input
                  type="text"
                  className="ps-input"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="ps-label">Email</label>
              <input
                type="email"
                required
                className="ps-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="ps-label">Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="ps-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">{error}</div>
            )}

            <button type="submit" disabled={submitting || !isSupabaseConfigured} className="ps-btn-primary w-full">
              {submitting ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="font-semibold text-gray-900 hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Create one'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Signed in — show profile
  return (
    <div className="py-6">
      <div className="mx-auto max-w-2xl">
        <div className="ps-card mb-6 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-xl font-bold text-gray-700">
              {(profile?.display_name ?? user.email ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">
                {profile?.display_name ?? 'Protein Shortlist User'}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-gray-500">
                <Mail size={14} />
                {user.email}
              </p>
              {profile?.is_admin && (
                <span className="mt-1.5 inline-flex ps-badge-green">
                  <Shield size={12} />
                  Administrator
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/saved')}
            className="ps-card-hover flex items-center gap-3 p-5 text-left"
          >
            <Heart size={20} className="text-gray-700" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Saved products</p>
              <p className="text-xs text-gray-400">Your shortlist</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/basket')}
            className="ps-card-hover flex items-center gap-3 p-5 text-left"
          >
            <ShoppingBasket size={20} className="text-gray-700" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Basket</p>
              <p className="text-xs text-gray-400">Your items</p>
            </div>
          </button>
        </div>

        {profile?.is_admin && (
          <button
            onClick={() => navigate('/admin')}
            className="ps-btn-secondary mt-4 w-full"
          >
            <Shield size={16} />
            Admin panel
          </button>
        )}

        <button
          onClick={signOut}
          className="ps-btn-ghost mt-4 w-full text-gray-500"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}

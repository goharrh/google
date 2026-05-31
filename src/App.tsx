import { useState, useEffect } from 'react';
import Login from './components/Login';
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './lib/supabase';
import { Employee } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { Analytics } from '@vercel/analytics/react';

const pendingProfileFetches = new Map<string, Promise<boolean>>();

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Employee | null>(null);
  const [view, setView] = useState<'login' | 'dashboard'>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecovery, setIsRecovery] = useState(() => {
    try {
      return window.location.hash.includes('type=recovery') || 
             window.location.pathname.includes('reset-password') ||
             sessionStorage.getItem('is_recovery_flow') === 'true';
    } catch {
      return false;
    }
  });

  const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'undefined');

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log('App: initAuth started. Supabase Configured:', isSupabaseConfigured);
      
      // If we're in mock mode, bypass Supabase initialization
      if (!isSupabaseConfigured) {
        console.log('App: Demo Mode - checking local storage');
        const savedUser = localStorage.getItem('demo_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUserProfile(parsed);
            setSession({ user: parsed });
            setView('dashboard');
            console.log('App: Demo Mode - user restored');
          } catch (e) {
            console.error('App: Failed to parse stored user', e);
            localStorage.removeItem('demo_user');
            setView('login');
          }
        } else {
          setView('login');
        }
        setIsLoading(false);
        return;
      }

      // Supabase Mode: Rely on onAuthStateChange for initial session
      // This is more robust than manual getSession which can hang in some browser contexts
      console.log('App: Supabase Mode - waiting for auth listener initial event');
    };

    initAuth();

    // Absolute safety timeout - if we are STILL loading after 20 seconds, force it
    // But don't force a view change, let the auth state listener handle it
    const finalSafetyTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('App: FINAL safety timeout! Forcing loading false.');
        setIsLoading(false);
        // We stay on the current view (likely loading) or let the auth listener decide
      }
    }, 20000);

    const { data: { subscription } } = !isSupabaseConfigured
      ? { data: { subscription: { unsubscribe: () => {} } } }
      : supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          console.log('App: Auth state change event:', event);
          setSession(session);

          let isRecoveryFlow = false;
          try {
            isRecoveryFlow = event === 'PASSWORD_RECOVERY' || 
              window.location.hash.includes('type=recovery') || 
              window.location.pathname.includes('reset-password') ||
              sessionStorage.getItem('is_recovery_flow') === 'true';
          } catch {
            isRecoveryFlow = false;
          }

          if (isRecoveryFlow) {
            console.log('App: Intercepted password recovery flow.');
            setIsRecovery(true);
            setView('login');
            setIsLoading(false);
            return;
          }

          if (session) {
            setProfileError(null);
            if (isRecovery || isRecoveryFlow) {
              setView('login');
              setIsLoading(false);
              return;
            }
            const success = await fetchProfile(session.user.email!);
            if (success) {
              setView('dashboard');
            } else {
              setProfileError('Failed to synchronize profile. Your session is active but profile data is unreachable.');
              console.error('App: Failed to sync profile. Check network or database permissions.');
              // We don't force view change here if they are already on dashboard
              // But if they are just logging in, they'll see the error state on the loading screen
            }
          } else {
            setUserProfile(null);
            // Only go to login if it's a signed out event
            if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
              setView('login');
            }
          }
          setIsLoading(false);
        });

    const handleFocus = async () => {
      if (isSupabaseConfigured && !session && mounted) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession && mounted) {
          console.log('App: Session restored on focus');
          setSession(currentSession);
          await fetchProfile(currentSession.user.email!);
          setView('dashboard');
        }
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      if (finalSafetyTimeout) clearTimeout(finalSafetyTimeout);
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchProfile = async (email: string, attempt = 1): Promise<boolean> => {
    if (!isSupabaseConfigured) return false;
    if (!email || email.trim() === '') {
      console.warn('App: fetchProfile received empty email context.');
      return false;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const cacheKey = `${emailTrimmed}-${attempt}`;

    if (pendingProfileFetches.has(cacheKey)) {
      console.log(`App: Reusing active connection query for ${emailTrimmed} (Attempt ${attempt})`);
      return pendingProfileFetches.get(cacheKey)!;
    }

    const runFetch = async (): Promise<boolean> => {
      console.log(`App: Fetching profile for: ${emailTrimmed} (Attempt ${attempt})`);
      try {
        setProfileError(null);
        
        // Use simpler select with limit(1) instead of maybeSingle() to bypass potential Postgres/PostgREST RLS plan locks
        const fetchPromise = supabase
          .from('emp')
          .select('*')
          .eq('email', emailTrimmed)
          .limit(1);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile sync timeout - database response delayed.')), 10000)
        );

        console.time(`fetchProfile-${emailTrimmed}-${attempt}`);
        const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
        console.timeEnd(`fetchProfile-${emailTrimmed}-${attempt}`);

        const data = result?.data;
        const error = result?.error;

        if (error) {
          console.error('App: Supabase error fetching profile:', error);
          throw error;
        }

        if (data && data.length > 0) {
          const profile = data[0];
          console.log('App: Profile fetched successfully:', profile.role);
          try {
            // Write to local cache for resilient offline-fallback
            localStorage.setItem(`profile_${emailTrimmed}`, JSON.stringify(profile));
          } catch (e) {
            console.error('App: Failed to cache to localStorage:', e);
          }
          setUserProfile(profile);
          setProfileError(null);
          return true;
        } else {
          console.warn('App: No profile found in emp table for email:', emailTrimmed);
          if (attempt < 3) {
            console.log(`App: Retrying profile fetch in ${attempt * 2000}ms...`);
            await new Promise(r => setTimeout(r, attempt * 2000));
            return fetchProfile(email, attempt + 1);
          }

          // Let's try falling back to local cache before fully failing!
          try {
            const cached = localStorage.getItem(`profile_${emailTrimmed}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              console.warn('App: Using local fallback profile for missing record in database:', parsed.role);
              setUserProfile(parsed);
              setProfileError(null);
              return true;
            }
          } catch (cacheErr) {
            console.error('App: Failed to read from profile cache fallback', cacheErr);
          }

          setProfileError(`Account synchronization failed: No employee record found for ${emailTrimmed}. Please contact your administrator.`);
          return false;
        }
      } catch (err: any) {
        console.error('App: Error fetching profile:', err);

        // Fall back to local cache if we fail on errors/timeouts
        try {
          const cached = localStorage.getItem(`profile_${emailTrimmed}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            console.warn('App: Dynamic SQL Fallback active. Restoring from cached local profile:', parsed.role);
            setUserProfile(parsed);
            setProfileError(null);
            return true;
          }
        } catch (cacheErr) {
          console.error('App: Failed to read from profile cache fallback', cacheErr);
        }

        if (attempt < 3) {
          console.log(`App: Retrying profile fetch after error in ${attempt * 2000}ms...`);
          await new Promise(r => setTimeout(r, attempt * 2000));
          return fetchProfile(email, attempt + 1);
        }
        setProfileError(`Link lost: ${err.message || 'Unknown protocol error'}`);
        return false;
      }
    };

    const fetchPromiseWithCache = runFetch();
    pendingProfileFetches.set(cacheKey, fetchPromiseWithCache);
    try {
      return await fetchPromiseWithCache;
    } finally {
      pendingProfileFetches.delete(cacheKey);
    }
  };

  const handleRetryProfile = () => {
    if (session?.user?.email) {
      setProfileError(null);
      fetchProfile(session.user.email);
      setRetryCount(prev => prev + 1);
    }
  };

  const handleLoginSuccess = (user: any, session?: any) => {
    console.log('Login success handler called:', user.role);
    try {
      sessionStorage.removeItem('is_recovery_flow');
    } catch (e) {}
    setIsRecovery(false);
    setUserProfile(user);
    if (session) {
      setSession(session);
      if (user && user.email) {
        try {
          localStorage.setItem(`profile_${user.email.trim().toLowerCase()}`, JSON.stringify(user));
        } catch (e) {}
      }
    } else if (!isSupabaseConfigured) {
      setSession({ user });
      localStorage.setItem('demo_user', JSON.stringify(user));
    }
    setView('dashboard');
    setIsLoading(false);
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('is_recovery_flow');
    } catch (e) {}
    setIsRecovery(false);
    await supabase.auth.signOut();
    localStorage.removeItem('demo_user');
    setSession(null);
    setUserProfile(null);
    setView('login');
  };

  return (
    <ThemeProvider>
      <Analytics />
      {isLoading ? (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center font-sans transition-colors duration-500">
          <div className="flex flex-col items-center gap-6 max-w-xs text-center">
            <div className="w-12 h-12 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">Initializing System</p>
              <p className="text-xs text-slate-400">Verifying secure database connection...</p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setIsLoading(false)}
                className="px-4 py-1.5 border border-slate-200 dark:border-slate-800 text-[9px] text-slate-400 uppercase tracking-widest hover:text-[#10b981] hover:border-[#10b981] transition-all"
              >
                Skip Verification
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-1.5 border border-slate-200 dark:border-slate-800 text-[9px] text-slate-400 uppercase tracking-widest hover:text-red-500 hover:border-red-500 transition-all"
              >
                Fix Connection (Sign Out)
              </button>
            </div>
          </div>
        </div>
      ) : view === 'login' ? (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          isRecovery={isRecovery}
          onCancelRecovery={() => {
            try {
              sessionStorage.removeItem('is_recovery_flow');
            } catch (e) {}
            setIsRecovery(false);
          }}
        />
      ) : view === 'dashboard' ? (
        userProfile ? (
          userProfile.role === 'admin' ? (
            <AdminDashboard user={userProfile} onLogout={handleLogout} />
          ) : (
            <TeacherDashboard user={userProfile} onLogout={handleLogout} />
          )
        ) : (
          <div className="min-h-screen bg-[var(--background)] flex items-center justify-center font-sans p-6">
            <div className="flex flex-col items-center gap-6 max-w-sm text-center">
              <div className="relative">
                <div className="w-16 h-16 border-2 border-emerald-500/20 rounded-2xl animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500">System Link Delay</h2>
                  {profileError ? (
                    <p className="text-[10px] text-red-500 uppercase tracking-widest leading-loose bg-red-500/5 p-4 border border-red-500/10 rounded-2xl">
                      {profileError}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-loose">
                      Establishing secure relay to administrative servers...
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleRetryProfile}
                    className="w-full bg-[#10b981] text-[#020617] rounded-xl font-bold py-4 text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    Retry Handshake {retryCount > 0 ? `(${retryCount})` : ''}
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full px-8 py-4 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest hover:text-white hover:bg-slate-900 dark:hover:bg-slate-800 transition-all rounded-xl"
                  >
                    Disconnect & Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </ThemeProvider>
  );
}

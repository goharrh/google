import { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AlertCircle, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { School } from '../types';

interface LoginProps {
  onLoginSuccess: (user: any, session?: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [view, setView] = useState<'login' | 'forgot-password'>('login');

  const [schools, setSchools] = useState<School[]>([]);
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    if (!isSupabaseConfigured) return;

    const { data } = await supabase.from('schools').select('*');
    if (data) setSchools(data);
  };

  // =========================
  // LOGIN (FIXED)
  // =========================
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const input = cnic.trim();
      const pass = password.trim();

      const isEmail = input.includes('@');

      // STEP 1: resolve email if CNIC used
      let email = isEmail ? input : null;

      if (!email) {
        const { data, error } = await supabase
          .from('emp')
          .select('email')
          .or(`cnic.eq.${input},username.eq.${input}`)
          .limit(1)
          .single();

        if (error || !data) throw new Error('User not found');

        email = data.email;
      }

      // STEP 2: Supabase Auth login
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });

      if (authError) throw authError;

      // STEP 3: fetch profile using auth_id (SAFE with RLS)
      const { data: emp, error: empError } = await supabase
        .from('emp')
        .select('*')
        .eq('auth_id', authData.user.id)
        .single();

      if (empError || !emp) throw new Error('Profile not found');

      onLoginSuccess(emp, authData.session);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // GOOGLE LOGIN
  // =========================
  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      setIsLoading(false);
    }
  };

  // =========================
  // RESET PASSWORD
  // =========================
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;

      setSuccess('Password reset link sent to your email');
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <motion.div className="w-[420px] p-6 bg-zinc-900 rounded-xl border border-zinc-800">

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold flex items-center justify-center gap-2">
            <Shield /> EduScan Login
          </h1>
        </div>

        {/* ERROR / SUCCESS */}
        <AnimatePresence>
          {error && (
            <div className="p-2 mb-3 text-red-400 text-sm flex gap-2">
              <AlertCircle /> {error}
            </div>
          )}
          {success && (
            <div className="p-2 mb-3 text-green-400 text-sm flex gap-2">
              <Shield /> {success}
            </div>
          )}
        </AnimatePresence>

        {view === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">

            <input
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              placeholder="CNIC or Email"
              className="w-full p-2 bg-black border border-zinc-700 rounded"
              required
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-2 bg-black border border-zinc-700 rounded"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-sm"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              disabled={isLoading}
              className="w-full bg-emerald-500 text-black p-2 rounded font-bold"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">

            <input
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-2 bg-black border border-zinc-700 rounded"
              required
            />

            <button
              disabled={isLoading}
              className="w-full bg-blue-500 text-white p-2 rounded"
            >
              Send Reset Link
            </button>

          </form>
        )}

        {/* GOOGLE LOGIN */}
        {view === 'login' && (
          <button
            onClick={handleGoogleLogin}
            className="w-full mt-4 border border-zinc-700 p-2 rounded"
          >
            Continue with Google
          </button>
        )}

        {/* SWITCH */}
        <p
          onClick={() =>
            setView(view === 'login' ? 'forgot-password' : 'login')
          }
          className="text-center text-sm mt-4 cursor-pointer text-gray-400"
        >
          {view === 'login' ? 'Forgot password?' : 'Back to login'}
        </p>

      </motion.div>
    </div>
  );
}

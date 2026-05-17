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
  const [view, setView] = useState<'login' | 'forgot-password' | 'signup' | 'staff-signup'>('login');
  const [schools, setSchools] = useState<School[]>([]);

  const isSupabaseConfigured =
    !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'undefined');

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    if (!isSupabaseConfigured) return;

    const { data } = await supabase.from('schools').select('*');
    if (data) setSchools(data);
  };

  // =========================
  // LOGIN (AUTH ONLY)
  // =========================
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const trimmedInput = cnic.trim();
      const trimmedPassword = password.trim();

      let email = trimmedInput;

      // If CNIC entered → resolve email from emp table (NO PASSWORD CHECK HERE)
      const isEmail = trimmedInput.includes('@');

      if (!isEmail) {
        const { data, error } = await supabase
          .from('emp')
          .select('email')
          .eq('cnic', trimmedInput)
          .maybeSingle();

        if (error || !data?.email) {
          throw new Error('CNIC not found. Please contact admin.');
        }

        email = data.email;
      }

      // AUTH ONLY LOGIN
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password: trimmedPassword,
        });

      if (authError || !authData.session) {
        throw new Error('Invalid login credentials');
      }

      // Fetch profile (NO PASSWORD USED)
      const { data: emp } = await supabase
        .from('emp')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      onLoginSuccess(emp, authData.session);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // RESET PASSWORD (AUTH ONLY)
  // =========================
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess('Password reset link sent to email.');
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center p-8">

        <motion.div className="w-full max-w-md bg-card border p-8 rounded-2xl">

          <h2 className="text-xl font-bold mb-6">Login</h2>

          <AnimatePresence>
            {error && (
              <div className="mb-4 text-red-500 flex gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 text-green-500 flex gap-2">
                <Shield className="w-4 h-4" />
                {success}
              </div>
            )}
          </AnimatePresence>

          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">

              <input
                type="text"
                placeholder="CNIC or Email"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                className="w-full border p-2"
                required
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border p-2"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              <button
                disabled={isLoading}
                className="w-full bg-green-500 text-black p-2"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>

              <button
                type="button"
                onClick={() => setView('forgot-password')}
                className="text-sm text-blue-500"
              >
                Forgot password?
              </button>
            </form>
          )}

          {view === 'forgot-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">

              <input
                type="email"
                placeholder="Email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full border p-2"
                required
              />

              <button className="w-full bg-green-500 p-2">
                Send Reset Link
              </button>

              <button
                type="button"
                onClick={() => setView('login')}
                className="text-sm"
              >
                Back
              </button>
            </form>
          )}

        </motion.div>
      </div>
    </div>
  );
}

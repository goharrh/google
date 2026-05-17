import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: (user: any, session?: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [name, setName] = useState('');
  const [cnic, setCnic] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ================= LOGIN =================
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;

      // Fetch role from emp table
      const { data: emp, error: empError } = await supabase
        .from('emp')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (empError || !emp) {
        throw new Error('User not found in system');
      }

      onLoginSuccess(emp, data.session);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= SIGNUP =================
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create Auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;

      // Insert into emp table
      const { error: empError } = await supabase.from('emp').insert({
        name,
        email,
        cnic,
        role: 'teacher', // change to admin if needed
        is_active: true,
        auth_id: user?.id
      });

      if (empError) throw empError;

      setSuccess('Account created! You can now login.');
      setView('login');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>{view === 'login' ? 'Login' : 'Signup'}</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      {view === 'login' ? (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          /><br /><br />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          /><br /><br />

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p onClick={() => setView('signup')} style={{ cursor: 'pointer', color: 'blue' }}>
            Create account
          </p>
        </form>
      ) : (
        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          /><br /><br />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          /><br /><br />

          <input
            type="text"
            placeholder="CNIC"
            value={cnic}
            onChange={(e) => setCnic(e.target.value)}
            required
          /><br /><br />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          /><br /><br />

          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Signup'}
          </button>

          <p onClick={() => setView('login')} style={{ cursor: 'pointer', color: 'blue' }}>
            Back to login
          </p>
        </form>
      )}
    </div>
  );
}

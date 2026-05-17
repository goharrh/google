import { useState, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AlertCircle, Eye, EyeOff, ChevronDown } from 'lucide-react';
import bcrypt from 'bcryptjs';
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
  const [view, setView] = useState<'login' | 'forgot-password' | 'signup' | 'staff-signup' | 'google-setup'>('login');
  const [schools, setSchools] = useState<School[]>([]);
  const [googleUserEmail, setGoogleUserEmail] = useState('');
  const [googleUserName, setGoogleUserName] = useState('');
  const [googleSetupData, setGoogleSetupData] = useState({
    role: 'teacher' as 'admin' | 'teacher',
    emis: '',
    cnic: '',
    designation: 'PST',
    schoolName: '',
    circle: '',
    location: '',
  });
  const [signupData, setSignupData] = useState({
    schoolName: '',
    emis: '',
    adminName: '',
    email: '',
    cnic: '',
    password: '',
    location: '',
    circle: '',
    designation: 'PSHT',
  });

  const [staffData, setStaffData] = useState({
    name: '',
    email: '',
    emis: '',
    cnic: '',
    password: '',
    designation: 'PST',
  });

  const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'undefined');

  useEffect(() => {
    fetchSchools();
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        setIsLoading(true);
        // Check if employee record exists
        const { data: emp, error } = await supabase
          .from('emp')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle();

        if (emp) {
          console.log('Google Session Auto-Login succeeded for:', session.user.email);
          onLoginSuccess(emp, session);
        } else {
          console.log('Google Session Active, but no employee profile exists for:', session.user.email);
          setGoogleUserEmail(session.user.email || '');
          setGoogleUserName(session.user.user_metadata?.full_name || '');
          setView('google-setup');
        }
      }
    } catch (err) {
      console.error('Error checking active session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchools = async () => {
    if (!isSupabaseConfigured) {
      console.log('Mock Mode: Skipping school fetch');
      return;
    }
    try {
      const { data } = await supabase.from('schools').select('*');
      if (data) setSchools(data);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // Mock signup logic
        setSuccess('School registered successfully! Admin set as PSHT.');
        setView('login');
        setIsLoading(false);
        return;
      }

      // 1. Create School
      const { error: schoolError } = await supabase
        .from('schools')
        .insert({
          id: Math.floor(Math.random() * 2147483647),
          emis_code: signupData.emis,
          name: signupData.schoolName,
          circle_name: signupData.circle,
          location: signupData.location,
        });

      if (schoolError) throw new Error(`School Registration Failed: ${schoolError.message}`);

      // 2. Create Admin Employee
      const hashedPassword = bcrypt.hashSync(signupData.password, 10);
      const { error: empError } = await supabase
        .from('emp')
        .insert({
          id: Math.floor(Math.random() * 2147483647), // Fallback ID for non-auto-incrementing columns
          name: signupData.adminName,
          email: signupData.email,
          cnic: signupData.cnic,
          password: hashedPassword,
          role: 'admin',
          emis: signupData.emis,
          designation: signupData.designation,
          is_active: true
        });

      if (empError) throw new Error(`Admin Account Creation Failed: ${empError.message}`);

      setSuccess(`School registration complete! Admin user created as ${signupData.designation}.`);
      setView('login');
      fetchSchools(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured) {
        setSuccess('Staff registration successful (Mock)!');
        setView('login');
        setIsLoading(false);
        return;
      }

      const hashedPassword = bcrypt.hashSync(staffData.password, 10);
      const { error: empError } = await supabase
        .from('emp')
        .insert({
          id: Math.floor(Math.random() * 2147483647), // Fallback ID for non-auto-incrementing columns
          name: staffData.name,
          email: staffData.email,
          cnic: staffData.cnic,
          password: hashedPassword,
          role: 'teacher',
          emis: staffData.emis,
          designation: staffData.designation,
          is_active: true // Auto-active for demo, typically needs approval
        });

      if (empError) throw new Error(`Staff Registration Failed: ${empError.message}`);

      // Attempt Auth sync
      await supabase.auth.signUp({
        email: staffData.email,
        password: staffData.password,
        options: {
          data: {
            name: staffData.name,
            role: 'teacher',
            emis: staffData.emis
          }
        }
      }).catch(err => console.warn('Auth sync failed (signup):', err));

      setSuccess('Staff account created successfully! You can now login.');
      setView('login');
    } catch (err: any) {
      setError(err.message || 'Staff registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const trimmedCnic = cnic.trim();
    const trimmedPassword = password.trim();

    console.log('Login attempt started...', { isSupabaseConfigured });

    // Check if we should use mock data immediately
    if (!isSupabaseConfigured) {
      console.log('Using mock login logic for:', trimmedCnic);
      setTimeout(() => {
        // Simplified check for demo mode
        if ((trimmedCnic === '12345-1234567-1' || trimmedCnic === 'admin') && trimmedPassword === 'admin') {
          const adminUser = { 
            id: 1, 
            cnic: '12345-1234567-1', 
            name: 'Principal Admin', 
            role: 'admin',
            username: 'admin',
            emis: '21122',
            is_active: true
          };
          console.log('Mock Admin Login Success - Calling onLoginSuccess');
          onLoginSuccess(adminUser);
        } else if ((trimmedCnic === '54321-7654321-2' || trimmedCnic === 'teacher') && trimmedPassword === 'teacher') {
          const teacherUser = { 
            id: 2, 
            cnic: '54321-7654321-2', 
            name: 'Sarah Ahmed', 
            role: 'teacher', 
            username: 'teacher',
            emis: '21122',
            is_active: true
          };
          console.log('Mock Teacher Login Success - Calling onLoginSuccess');
          onLoginSuccess(teacherUser);
        } else {
          console.log('Mock Login Failed - Incorrect credentials');
          setError('Invalid CNIC or Password');
          setIsLoading(false);
        }
      }, 500);
      return;
    }

    try {
      const isEmail = trimmedCnic.includes('@');
      let emp = null;
      let session = null;
      let resolvedEmail = isEmail ? trimmedCnic : null;

      // STEP 1: If it's a CNIC or Username, attempt to resolve the email through a secure RPC function.
      // Postgres Security Definer Functions bypass RLS and are the standard secure way to map CNIC -> Email.
      if (!isEmail) {
        console.log('Attempting to resolve CNIC/Username via secure RPC...');
        try {
          const { data, error: rpcError } = await supabase
            .rpc('get_emp_email_by_login', { p_login: trimmedCnic });
          
          if (!rpcError && data) {
            console.log('Successfully resolved login identifier to email via RPC:', data);
            resolvedEmail = data;
          } else if (rpcError) {
            console.warn('RPC lookup returned error or function not installed. Fallback to direct check.', rpcError.message);
          }
        } catch (rpcErr) {
          console.warn('RPC exception. Fallback to direct check.', rpcErr);
        }
      }

      // STEP 2: Dual Path Authentication Strategy
      // Path A: If we have an email (resolved or direct), attempt Supabase Auth Sign-In FIRST.
      // This is crucial because when RLS is enabled, they MUST be authenticated with Supabase to select from 'emp'!
      if (resolvedEmail) {
        console.log(`Attempting Supabase Auth sign-in for: ${resolvedEmail}...`);
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password: trimmedPassword,
        });

        if (!authError && authData.session) {
          console.log('Auth sign-in successful. Fetching profile using authenticated session...');
          session = authData.session;
          
          // Now that we are signed in, the authenticated session lets us read the employee record
          const { data: authenticatedEmp, error: fetchError } = await supabase
            .from('emp')
            .select('*')
            .eq('email', resolvedEmail)
            .maybeSingle();

          if (!fetchError && authenticatedEmp) {
            emp = authenticatedEmp;
          } else {
            console.warn('Auth succeeded but profile fetch failed (possible missing RLS policy for reading own profile):', fetchError);
          }
        } else {
          console.warn('Auth sign-in failed, checking custom database credentials path...', authError?.message);
        }
      }

      // Path B: Fallback / Initial Database Fetch (e.g. if Auth failed because user doesn't exist in Supabase Auth yet, OR if no email is resolved)
      if (!emp) {
        console.log('Attempting custom direct database credentials verification...');
        
        // Query the 'emp' table.
        // NOTE: If RLS is enabled, this will only return rows if the user has a SELECT policy allowing it,
        // or if they run the RPC or policy we provide.
        const { data: tempEmp, error: dbError } = await supabase
          .from('emp')
          .select('*')
          .or(isEmail ? `email.eq."${trimmedCnic}"` : `cnic.eq."${trimmedCnic}",username.eq."${trimmedCnic}"`)
          .maybeSingle();

        if (dbError) {
          console.error('Database query error:', dbError);
          throw new Error(`Connection Error: ${dbError.message}. If Row-Level Security (RLS) is active on the 'emp' table, you must add policies or use the SQL functions provided.`);
        }

        if (!tempEmp) {
          throw new Error('Record not found. Ensure your CNIC/Email is correct, or if RLS is enabled on your database, configure the required SELECT policies or get_emp_email_by_login RPC function.');
        }

        // Verify password with Bcrypt
        const isPasswordValid = tempEmp.password && (
          bcrypt.compareSync(trimmedPassword, tempEmp.password) || 
          trimmedPassword === tempEmp.password
        );
        
        if (!isPasswordValid) {
          throw new Error('Invalid CNIC, Email, or Password');
        }

        emp = tempEmp;

        // Sync with Supabase Auth dynamically if not done yet
        if (emp.email) {
          console.log('Creating/Syncing Supabase Auth account for verified employee...');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: emp.email,
            password: trimmedPassword,
            options: {
              data: {
                name: emp.name,
                role: emp.role,
                cnic: emp.cnic
              }
            }
          });

          if (!signUpError && signUpData.session) {
            session = signUpData.session;
          } else if (signUpError) {
            console.warn('Auth creation/sync failed (SignUp):', signUpError.message);
          }
        }
      }

      if (!emp) {
        throw new Error('Authentication failed: Could not retrieve employee profile.');
      }

      onLoginSuccess(emp, session);
    } catch (err: any) {
      console.error('Login process exception:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);

    if (!isSupabaseConfigured) {
      console.log('Simulating Google Login in Demo Mode...');
      setTimeout(() => {
        // Check if we already have a saved demo Google user session
        const demoEmail = 'GermanGtx366@gmail.com';
        const savedGoogleUser = localStorage.getItem('demo_google_user');
        
        if (savedGoogleUser) {
          try {
            const parsed = JSON.parse(savedGoogleUser);
            setSuccess('Google Login simulated successfully!');
            onLoginSuccess(parsed, { user: parsed });
            setIsLoading(false);
            return;
          } catch (e) {
            localStorage.removeItem('demo_google_user');
          }
        }

        // First-time simulation: switch to setups screen
        setGoogleUserEmail(demoEmail);
        setGoogleUserName('German (Google Admin)');
        setView('google-setup');
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      console.log('Initiating Supabase Google OAuth sign-in...');
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (oauthError) throw oauthError;
    } catch (err: any) {
      console.error('Google OAuth initialization failed:', err);
      setError(err.message || 'Failed to initialize Google Login');
      setIsLoading(false);
    }
  };

  const handleGoogleSetupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured) {
        let newUser: any = {
          id: Math.floor(Math.random() * 10000),
          name: googleUserName,
          email: googleUserEmail,
          cnic: googleSetupData.cnic,
          role: googleSetupData.role,
          emis: googleSetupData.emis,
          designation: googleSetupData.designation,
          is_active: true,
        };

        if (googleSetupData.role === 'admin') {
          setSchools(prev => [
            ...prev,
            {
              id: Math.floor(Math.random() * 10000),
              name: googleSetupData.schoolName,
              emis_code: googleSetupData.emis,
              address: googleSetupData.location || null,
              phone: null,
              is_active: true,
              created_at: new Date().toISOString(),
            }
          ]);
        }

        localStorage.setItem('demo_google_user', JSON.stringify(newUser));
        setSuccess('Account profile created successfully!');
        setIsLoading(false);
        onLoginSuccess(newUser, { user: newUser });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active auth session. Please try signing in again.');
      }

      const userEmail = session.user.email;
      if (!userEmail) {
        throw new Error('No email found in Google Auth session.');
      }

      if (googleSetupData.role === 'admin') {
        // 1. Create School
        const { error: schoolError } = await supabase
          .from('schools')
          .insert({
            id: Math.floor(Math.random() * 2147483647),
            emis_code: googleSetupData.emis,
            name: googleSetupData.schoolName,
            circle_name: googleSetupData.circle,
            location: googleSetupData.location,
          });

        if (schoolError) throw new Error(`School Registration Failed: ${schoolError.message}`);

        // 2. Create Admin Employee
        const { error: empError } = await supabase
          .from('emp')
          .insert({
            id: Math.floor(Math.random() * 2147483647),
            name: googleUserName,
            email: userEmail,
            cnic: googleSetupData.cnic,
            role: 'admin',
            emis: googleSetupData.emis,
            designation: googleSetupData.designation,
            is_active: true
          });

        if (empError) throw new Error(`Admin Account Creation Failed: ${empError.message}`);
      } else {
        // Create Teacher Employee
        const { error: empError } = await supabase
          .from('emp')
          .insert({
            id: Math.floor(Math.random() * 2147483647),
            name: googleUserName,
            email: userEmail,
            cnic: googleSetupData.cnic,
            role: 'teacher',
            emis: googleSetupData.emis,
            designation: googleSetupData.designation,
            is_active: true
          });

        if (empError) throw new Error(`Staff Account Creation Failed: ${empError.message}`);
      }

      // Fetch user profile from emp
      const { data: finalEmp, error: fetchError } = await supabase
        .from('emp')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (fetchError || !finalEmp) {
        throw new Error('Profile creation succeeded, but profile sync failed. Please try reloading the page.');
      }

      setSuccess('Profile initialized successfully!');
      onLoginSuccess(finalEmp, session);
    } catch (err: any) {
      setError(err.message || 'Profile setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSetupCancel = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    
    setView('login');
    setIsLoading(false);
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // Mock successful reset in demo mode
        setTimeout(() => {
          setSuccess('Reset instructions sent to your email (Demo Mode)');
          setIsLoading(false);
        }, 1000);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;
      
      setSuccess('Check your email for the password reset link.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      if (import.meta.env.VITE_SUPABASE_URL) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-500">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.3] dark:opacity-[0.1] pointer-events-none" />
      
      <div className="hidden md:flex md:w-1/2 p-12 flex-col justify-between relative z-10">
        <div>
          <div className="flex items-center gap-4 mb-20">
            <div className="w-8 h-8 bg-[#10b981] flex items-center justify-center transform rotate-45">
              <Shield className="w-4 h-4 text-[#020617] transform -rotate-45" />
            </div>
            <span className="text-lg font-light tracking-[0.3em] uppercase text-slate-900 dark:text-white">EduScan Pro</span>
          </div>
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl lg:text-7xl font-light tracking-[0.1em] uppercase leading-tight text-slate-900 dark:text-white">
              Digital<br />
              <span className="text-[#10b981]">Terminal</span>
            </h1>
            <div className="w-12 h-[1px] bg-[#10b981] my-6" />
            <p className="text-slate-500 text-xs uppercase tracking-[0.2em] max-w-xs leading-relaxed">
              Unified Education Management System.
            </p>
          </motion.div>
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-600 font-mono tracking-[0.3em] uppercase">
          <span>SECURE TERMINAL ACCESS v3.0</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-8 md:p-12 lg:p-24 justify-center items-center relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[420px] w-full bg-card border border-border p-10 shadow-2xl transition-colors duration-500 rounded-3xl md:rounded-none"
          style={{ padding: '22px' }}
        >
          <div className="mb-10 text-center">
            <h2 
              className="text-2xl font-light tracking-[0.2em] uppercase text-slate-900 dark:text-white mb-2"
            >
              {view === 'signup' ? 'School Registration' : view === 'staff-signup' ? 'Staff Enrollment' : 'Attendance System'}
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">
              {view === 'login' ? 'Enter Access Codes' : view === 'signup' ? 'Establish School Instance' : view === 'staff-signup' ? 'Join Your School Terminal' : 'Reset Access Credentials'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-3 bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 text-[10px] font-bold uppercase tracking-widest"
              >
                <AlertCircle className="w-4 h-4" />
                <p>{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-500 text-[10px] font-bold uppercase tracking-widest"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-2.5 h-2.5" />
                </div>
                <p>{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {view === 'login' ? (
            <div className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">CNIC Number or Email</label>
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="XXXXX-XXXXXXX-X or email@domain.com"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-all duration-350"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Password</label>
                    <button 
                      type="button" 
                      onClick={() => { setView('forgot-password'); setError(''); setSuccess(''); }}
                      className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-[#020617] border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-all duration-350"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-[#10b981]">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit" disabled={isLoading}
                  className={`w-full bg-[#10b981] text-[#020617] font-bold py-3 text-xs uppercase tracking-[0.2em] hover:bg-[#34d399] transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} shadow-lg shadow-emerald-500/10`}
                >
                  {isLoading ? "Verifying..." : "Initialize Session"}
                </button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[9px] text-slate-400 font-mono tracking-widest uppercase">OR</span>
                <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#020617] text-slate-800 dark:text-white border border-slate-200 dark:border-[#1e293b] rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-md outline-none cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.66l3.15-3.15C17.47 1.8 14.96 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.6 2.8C6.01 7.37 8.74 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.52 12.27c0-.82-.07-1.61-.21-2.38H12v4.5h6.48c-.28 1.48-1.12 2.73-2.38 3.58l3.68 2.85c2.15-1.98 3.4-4.9 3.4-8.55z" />
                  <path fill="#FBBC05" d="M5.1 14.7c-.24-.7-.37-1.46-.37-2.25s.13-1.55.37-2.25L1.5 7.4C.54 9.3 0 11.45 0 13.7s.54 4.4 1.5 6.3l3.6-2.8z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.96-1.08 7.95-2.92l-3.68-2.85c-.99.66-2.27 1.07-4.27 1.07-3.26 0-5.99-2.33-6.98-5.46L1.42 16.14C3.32 20.04 7.28 23 12 23z" />
                </svg>
                {isLoading ? "Signing In..." : "Log In with Google"}
              </button>

              <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">Enrollment Gate</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { setView('staff-signup'); setError(''); setSuccess(''); }}
                    className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.1em] border border-emerald-500/20 px-4 py-3 rounded-xl hover:bg-emerald-500/5 transition-all outline-none"
                  >
                    Staff Join
                  </button>
                  <button 
                    onClick={() => { setView('signup'); setError(''); setSuccess(''); }}
                    className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.1em] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all outline-none"
                  >
                    New School
                  </button>
                </div>
              </div>
            </div>
          ) : view === 'signup' ? (
            <form onSubmit={handleSignup} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter ml-1">School Name</label>
                  <input
                    type="text"
                    value={signupData.schoolName}
                    onChange={(e) => setSignupData({...signupData, schoolName: e.target.value})}
                    placeholder="Enter school name"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter ml-1">EMIS Code</label>
                  <input
                    type="text"
                    value={signupData.emis}
                    onChange={(e) => setSignupData({...signupData, emis: e.target.value})}
                    placeholder="18xxx"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter ml-1">Circle Name</label>
                  <input
                    type="text"
                    value={signupData.circle}
                    onChange={(e) => setSignupData({...signupData, circle: e.target.value})}
                    placeholder="Circle/Zone"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter ml-1">Location</label>
                  <input
                    type="text"
                    value={signupData.location}
                    onChange={(e) => setSignupData({...signupData, location: e.target.value})}
                    placeholder="City/Area"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[8px] font-bold text-emerald-500 uppercase tracking-[0.3em]">Admin Credentials</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Designation</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {['PSHT', 'Principal', 'Headmaster'].map((des) => (
                        <button
                          key={des}
                          type="button"
                          onClick={() => setSignupData({...signupData, designation: des})}
                          className={`py-2 text-[8px] uppercase font-bold tracking-widest border transition-all rounded-lg ${signupData.designation === des ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                        >
                          {des}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={signupData.adminName}
                    onChange={(e) => setSignupData({...signupData, adminName: e.target.value})}
                    placeholder="Admin Full Name"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                  <input
                    type="email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                    placeholder="Official Email"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                  <input
                    type="text"
                    value={signupData.cnic}
                    onChange={(e) => setSignupData({...signupData, cnic: e.target.value})}
                    placeholder="CNIC Number (XXXXX-XXXXXXX-X)"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                  <input
                    type="password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                    placeholder="Access Password"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit" disabled={isLoading}
                  className={`w-full bg-[#10b981] text-[#020617] font-bold py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-[#34d399] transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} shadow-lg shadow-emerald-500/10`}
                >
                  {isLoading ? "Provisioning..." : "Finalize Registration"}
                </button>
                <button 
                  type="button"
                  onClick={() => setView('login')}
                  className="w-full text-[10px] text-slate-500 uppercase tracking-widest font-bold py-2 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : view === 'staff-signup' ? (
            <form onSubmit={handleStaffSignup} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Select Your School</label>
                <div className="relative">
                  <select 
                    value={staffData.emis}
                    onChange={(e) => setStaffData({...staffData, emis: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors appearance-none"
                    required
                  >
                    <option value="">Select Institution...</option>
                    {schools.map(school => (
                      <option key={school.emis_code} value={school.emis_code} className="bg-white dark:bg-[#0f172a]">
                        {school.name} ({school.emis_code})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Designation</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['PST', 'SPST', 'Chawkidar'].map((des) => (
                      <button
                        key={des}
                        type="button"
                        onClick={() => setStaffData({...staffData, designation: des})}
                        className={`py-2 text-[8px] uppercase font-bold tracking-widest border transition-all rounded-lg ${staffData.designation === des ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                      >
                        {des}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={staffData.name}
                    onChange={(e) => setStaffData({...staffData, name: e.target.value})}
                    placeholder="Full Name (per CNIC)"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                  <input
                    type="email"
                    value={staffData.email}
                    onChange={(e) => setStaffData({...staffData, email: e.target.value})}
                    placeholder="Official Email"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                  <input
                    type="text"
                    value={staffData.cnic}
                    onChange={(e) => setStaffData({...staffData, cnic: e.target.value})}
                    placeholder="CNIC (XXXXX-XXXXXXX-X)"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                  <input
                    type="password"
                    value={staffData.password}
                    onChange={(e) => setStaffData({...staffData, password: e.target.value})}
                    placeholder="Set Access Password"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit" disabled={isLoading}
                  className={`w-full bg-[#10b981] text-[#020617] font-bold py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-[#34d399] transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} shadow-lg shadow-emerald-500/10`}
                >
                  {isLoading ? "Enrolling..." : "Begin Enrollment"}
                </button>
                <button 
                  type="button"
                  onClick={() => setView('login')}
                  className="w-full text-[10px] text-slate-500 uppercase tracking-widest font-bold py-2 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : view === 'google-setup' ? (
            <form onSubmit={handleGoogleSetupSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-center mb-4">
                <p className="text-xs text-[#10b981] font-mono uppercase tracking-widest font-bold">Google Profile Setup</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest leading-none truncate">{googleUserEmail}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Establish Link As</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { id: 'teacher', label: 'Teacher / Staff' },
                    { id: 'admin', label: 'Admin / Principal' }
                  ].map((roleOption) => (
                    <button
                      key={roleOption.id}
                      type="button"
                      onClick={() => setGoogleSetupData({
                        ...googleSetupData,
                        role: roleOption.id as 'admin' | 'teacher',
                        emis: '', 
                      })}
                      className={`py-3 text-[10px] uppercase font-bold tracking-widest border transition-all rounded-xl ${googleSetupData.role === roleOption.id ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                    >
                      {roleOption.label}
                    </button>
                  ))}
                </div>
              </div>

              {googleSetupData.role === 'admin' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter ml-1">School Name</label>
                      <input
                        type="text"
                        value={googleSetupData.schoolName}
                        onChange={(e) => setGoogleSetupData({...googleSetupData, schoolName: e.target.value})}
                        placeholder="Enter school name"
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter ml-1">EMIS Code</label>
                      <input
                        type="text"
                        value={googleSetupData.emis}
                        onChange={(e) => setGoogleSetupData({...googleSetupData, emis: e.target.value})}
                        placeholder="18xxx"
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter ml-1">Circle Name</label>
                      <input
                        type="text"
                        value={googleSetupData.circle}
                        onChange={(e) => setGoogleSetupData({...googleSetupData, circle: e.target.value})}
                        placeholder="Circle/Zone"
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter ml-1">Location</label>
                      <input
                        type="text"
                        value={googleSetupData.location}
                        onChange={(e) => setGoogleSetupData({...googleSetupData, location: e.target.value})}
                        placeholder="City/Area"
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Designation</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['PSHT', 'Principal', 'Headmaster'].map((des) => (
                        <button
                          key={des}
                          type="button"
                          onClick={() => setGoogleSetupData({...googleSetupData, designation: des})}
                          className={`py-2 text-[8px] uppercase font-bold tracking-widest border transition-all rounded-lg ${googleSetupData.designation === des ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                        >
                          {des}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Select Your School</label>
                    <div className="relative">
                      <select 
                        value={googleSetupData.emis}
                        onChange={(e) => setGoogleSetupData({...googleSetupData, emis: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors appearance-none"
                        required
                      >
                        <option value="">Select Institution...</option>
                        {schools.map(school => (
                          <option key={school.emis_code} value={school.emis_code} className="bg-white dark:bg-[#0f172a]">
                            {school.name} ({school.emis_code})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Designation</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['PST', 'SPST', 'Chawkidar'].map((des) => (
                        <button
                          key={des}
                          type="button"
                          onClick={() => setGoogleSetupData({...googleSetupData, designation: des})}
                          className={`py-2 text-[8px] uppercase font-bold tracking-widest border transition-all rounded-lg ${googleSetupData.designation === des ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                        >
                          {des}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm Identity Fields</label>
                  <input
                    type="text"
                    value={googleUserName}
                    onChange={(e) => setGoogleUserName(e.target.value)}
                    placeholder="Full Name (per CNIC)"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={googleSetupData.cnic}
                    onChange={(e) => setGoogleSetupData({...googleSetupData, cnic: e.target.value})}
                    placeholder="CNIC (XXXXX-XXXXXXX-X)"
                    className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit" disabled={isLoading}
                  className={`w-full bg-[#10b981] text-[#020617] font-bold py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-[#34d399] transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} shadow-lg shadow-emerald-500/10`}
                >
                  {isLoading ? "Setting Up Profile..." : "Complete Setup & Sign In"}
                </button>
                <button 
                  type="button"
                  onClick={handleGoogleSetupCancel}
                  className="w-full text-[10px] text-slate-500 uppercase tracking-widest font-bold py-2 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel & Sign Out
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Official Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm focus:outline-none focus:border-[#10b981] text-slate-900 dark:text-white transition-colors"
                  required
                />
                <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-2 leading-relaxed">
                  We will send authentication instructions to this address.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  type="submit" disabled={isLoading}
                  className={`w-full bg-[#10b981] text-[#020617] font-bold py-4 text-xs uppercase tracking-[0.2em] hover:bg-[#34d399] transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} shadow-lg shadow-emerald-500/10`}
                >
                  {isLoading ? "Transmitting..." : "Send Reset Link"}
                </button>
                <button
                  type="button"
                  onClick={() => { setView('login'); setError(''); setSuccess(''); }}
                  className="w-full py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Return to Login
                </button>
              </div>
            </form>
          )}

          {!isSupabaseConfigured && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800/50">
              <p className="text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-4 font-mono text-center">System Demonstration Mode</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] tracking-wider uppercase font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/40 rounded">
                  <span className="text-slate-500">Admin</span>
                  <button 
                    onClick={() => { setCnic('12345-1234567-1'); setPassword('admin'); }}
                    className="text-[#10b981] hover:underline"
                  >
                    Use Admin
                  </button>
                </div>
                <div className="flex justify-between items-center text-[10px] tracking-wider uppercase font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/40 rounded">
                  <span className="text-slate-500">Teacher</span>
                  <button 
                    onClick={() => { setCnic('54321-7654321-2'); setPassword('teacher'); }}
                    className="text-[#10b981] hover:underline"
                  >
                    Use Teacher
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

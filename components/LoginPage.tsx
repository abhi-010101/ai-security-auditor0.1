
import React, { useState } from 'react';
import { UserRole, User, UserStatus } from '../types';
import { db } from '../services/firebase';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetStates = () => {
      setError('');
      setSuccess('');
      setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
        const user = await db.login(email, password);
        if (user) {
            onLogin(user);
        } else {
            setError('Authorization Denied. Invalid Identity or Credentials.');
            setIsLoading(false);
        }
    } catch (e: any) {
        setError(e.message || 'System Error connecting to identity provider.');
        setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!fullName || !email || !password || !department) {
        setError('All fields are mandatory for security registration.');
        setIsLoading(false);
        return;
    }

    try {
        const newUser = await db.register({ name: fullName, email, password, department });
        onLogin(newUser);
    } catch (e: any) {
        setError('Identity creation failed. Data may be invalid.');
        setIsLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!email) {
        setError('University Email is required for recovery.');
        setIsLoading(false);
        return;
    }

    try {
        await db.resetPassword(email);
        setSuccess('Security link dispatched. Check your university inbox to reset your vault key.');
        setIsLoading(false);
    } catch (e: any) {
        setError(e.message || 'Identity verification failed.');
        setIsLoading(false);
    }
  };

  const handleSSO = async (provider: 'google' | 'microsoft' | 'phone') => {
      setIsLoading(true);
      setError('');
      try {
          const user = await db.socialLogin(provider);
          onLogin(user);
      } catch (e: any) {
          setError("Identity Provider Error: " + e.message);
          setIsLoading(false);
      }
  };

  const handleDemoBypass = async (role: UserRole) => {
    setIsLoading(true);
    const emails = {
        [UserRole.ADMIN]: 'admin@indira.edu',
        [UserRole.INFOSEC]: 'infosec@indira.edu',
        [UserRole.USER]: 'user@indira.edu'
    };
    const user = await db.login(emails[role], 'password');
    if (user) onLogin(user);
    else {
        setError(`Demo user ${role} not found in DB. Please register one.`);
        setIsLoading(false);
    }
  };

  const SocialButton = ({ icon, label, color, provider }: any) => (
      <button 
        type="button"
        onClick={() => handleSSO(provider)}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border transition-all hover:shadow-sm active:scale-95 ${color}`}
      >
          <span className="text-sm">{icon}</span>
          <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background Decorative Element */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-[#003B49] z-0"></div>
        
        <div className="bg-white w-full max-w-5xl min-h-[500px] md:min-h-[640px] rounded-3xl shadow-2xl z-10 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            {/* Branding Column - Desktop Only */}
            <div className="hidden md:flex w-1/2 bg-[#00282e] p-12 text-white flex-col justify-between relative overflow-hidden">
                 <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                 <div className="relative z-10">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="logo-box">
                            <span className="logo-symbol">I</span>
                            <div className="logo-dot"></div>
                        </div>
                        <div>
                            <h1 className="font-serif text-2xl font-bold tracking-wide">INDIRA</h1>
                            <p className="text-[10px] text-[#EAA400] uppercase tracking-[0.3em] font-bold">University</p>
                        </div>
                     </div>
                     <h2 className="text-4xl font-bold leading-tight mb-4 uni-font">Indira's AI Security Auditor</h2>
                     <p className="text-slate-400 text-sm leading-relaxed font-medium">
                         Security builds trust. At Indira University, we protect every user, every system, and every piece of data through verified access and continuous monitoring — creating a safe and secure digital campus for everyone.
                     </p>
                 </div>
                 <div className="relative z-10">
                     <div className="flex items-center gap-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                         <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                         The Information Security Department of Indira University
                     </div>
                 </div>
            </div>

            {/* Form Column */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col bg-white relative overflow-y-auto">
                {/* Mobile Identity Badge */}
                <div className="md:hidden flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-indira-navy rounded flex items-center justify-center text-indira-gold font-black">I</div>
                    <span className="font-serif text-lg font-bold text-indira-navy">INDIRA SECURITY</span>
                </div>

                <div className="mb-4">
                    <h3 className="text-xl md:text-2xl font-black text-[#003B49] mb-1 md:mb-2 uni-font uppercase tracking-tight">
                        {mode === 'register' ? 'registering new user' : mode === 'recovery' ? 'vault recovery' : 'Secure Login'}
                    </h3>
                    <p className="text-slate-400 text-[10px] md:text-xs font-medium uppercase tracking-[0.2em]">
                        {mode === 'register' ? 'Provision university credentials' : mode === 'recovery' ? 'Secure Identity Retrieval' : ''}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 md:p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[9px] md:text-[10px] font-black uppercase tracking-wider animate-in shake duration-300">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 md:p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-[9px] md:text-[10px] font-black uppercase tracking-wider animate-in fade-in duration-300">
                        {success}
                    </div>
                )}

                {mode === 'login' && (
                    <div className="space-y-2 mb-6">
                        <SocialButton 
                            icon="G" label="Sign in with Google" provider="google"
                            color="bg-white border-slate-200 text-slate-600 hover:bg-slate-50" 
                        />
                        <SocialButton 
                            icon="M" label="Sign in with Microsoft" provider="microsoft"
                            color="bg-[#2f2f2f] border-[#2f2f2f] text-white hover:bg-[#1a1a1a]" 
                        />
                         <SocialButton 
                            icon="📱" label="Continue with Phone OTP" provider="phone"
                            color="bg-white border-slate-200 text-slate-600 hover:bg-slate-50" 
                        />
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                            <div className="relative flex justify-center text-[9px] uppercase"><span className="bg-white px-2 text-slate-400 font-bold tracking-widest">Or Legacy Login</span></div>
                        </div>
                    </div>
                )}

                {mode === 'recovery' ? (
                    <form onSubmit={handleRecovery} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="block text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">email address</label>
                            <input 
                                type="email" 
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#006778] focus:bg-white text-[10px] md:text-xs font-bold text-[#003B49] transition-all"
                                placeholder="officer@indira.edu"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-3 bg-[#003B49] text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-xl hover:bg-[#00282e] transition-all shadow-xl disabled:opacity-70"
                        >
                            {isLoading ? 'Verifying...' : 'Request Recovery Key'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setMode('login'); resetStates(); }}
                            className="w-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indira-navy transition-colors"
                        >
                            Back to Secure Login
                        </button>
                    </form>
                ) : (
                    <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
                        {mode === 'register' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Full Name</label>
                                    <input 
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#006778] focus:bg-white text-[10px] md:text-xs font-bold text-[#003B49] transition-all"
                                        placeholder="e.g. Aditi Rao"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Department</label>
                                    <input 
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#006778] focus:bg-white text-[10px] md:text-xs font-bold text-[#003B49] transition-all"
                                        placeholder="e.g. Infosec"
                                        value={department}
                                        onChange={e => setDepartment(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">email address</label>
                            <input 
                                type="email" 
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#006778] focus:bg-white text-[10px] md:text-xs font-bold text-[#003B49] transition-all"
                                placeholder="officer@indira.edu"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest">password</label>
                                {mode === 'login' && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setMode('recovery'); resetStates(); }}
                                        className="text-[8px] md:text-[9px] font-bold text-indira-brand hover:underline"
                                    >
                                        Forgot credentials?
                                    </button>
                                )}
                            </div>
                            <input 
                                type="password" 
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#006778] focus:bg-white text-[10px] md:text-xs font-bold text-[#003B49] transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-3 bg-[#003B49] text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-xl hover:bg-[#00282e] transition-all shadow-xl disabled:opacity-70 mt-4 active:scale-[0.98]"
                        >
                            {isLoading ? 'Synchronizing...' : mode === 'register' ? 'Register User' : 'login'}
                        </button>
                    </form>
                )}

                {/* Toggle Link */}
                <div className="mt-6 text-center">
                    <button 
                        onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); resetStates(); }}
                        className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-indira-brand hover:text-indira-navy transition-colors underline underline-offset-4"
                    >
                        {mode === 'register' ? 'Already have an account? Login' : mode === 'login' ? 'Need an account? Request Access' : ''}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 text-center">Demo Environment Bypasses</p>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.values(UserRole).map(r => (
                            <button 
                                key={r}
                                onClick={() => handleDemoBypass(r)}
                                className="py-2 border border-slate-100 rounded text-[7px] md:text-[8px] font-black text-slate-500 uppercase hover:bg-slate-50 transition-all active:bg-slate-100"
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LoginPage;

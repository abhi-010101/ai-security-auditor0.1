
import React, { useState } from 'react';
import { UserRole, User, UserStatus } from '../types';
import { db } from '../services/firebase';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-[#003B49] z-0"></div>
        
        <div className="bg-white w-full max-w-5xl min-h-[640px] rounded-3xl shadow-2xl z-10 flex overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            <div className="w-1/2 bg-[#00282e] p-12 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex">
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
                     <h2 className="text-4xl font-bold leading-tight mb-4 uni-font">UniGuard AI Orchestrator</h2>
                     <p className="text-slate-400 text-sm leading-relaxed font-medium">
                         Secure university-wide auditing platform. Identity validation required to engage security agents and access authorized ledgers.
                     </p>
                 </div>
                 <div className="relative z-10">
                     <div className="flex items-center gap-3 text-xs text-slate-500 uppercase tracking-widest font-bold">
                         <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                         Command Center Gateway v2.4
                     </div>
                 </div>
            </div>

            <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white relative">
                <div className="mb-8">
                    <h3 className="text-2xl font-black text-[#003B49] mb-2 uni-font">
                        {isRegistering ? 'Identity Registration' : 'Secure Portal Login'}
                    </h3>
                    <p className="text-slate-400 text-sm font-medium">
                        {isRegistering ? 'Provision your account for research audits.' : 'Authorization required for secure node access.'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[10px] font-black uppercase tracking-wider animate-in shake duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                    {isRegistering && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Full Name</label>
                                <input 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#006778] text-xs font-bold text-[#003B49]"
                                    placeholder="Aditi Rao"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Department</label>
                                <input 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#006778] text-xs font-bold text-[#003B49]"
                                    placeholder="Comp-Sci"
                                    value={department}
                                    onChange={e => setDepartment(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Personnel Email</label>
                        <input 
                            type="email" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#006778] text-xs font-bold text-[#003B49]"
                            placeholder="officer@indira.edu"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Security Key</label>
                        <input 
                            type="password" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#006778] text-xs font-bold text-[#003B49]"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-4 bg-[#003B49] text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl hover:bg-[#00282e] transition-all shadow-xl flex justify-center items-center gap-3 disabled:opacity-70 mt-4"
                    >
                        {isLoading ? 'Synchronizing...' : isRegistering ? 'Provision ID' : 'Establish Session'}
                    </button>
                </form>

                <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">{isRegistering ? 'Already registered?' : 'Need an ID?'}</span>
                    <button 
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-indira-brand hover:underline"
                    >
                        {isRegistering ? 'Return to Login' : 'Request Access'}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 text-center">Demo Environment Bypasses</p>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.values(UserRole).map(r => (
                            <button 
                                key={r}
                                onClick={() => handleDemoBypass(r)}
                                className="py-2 border border-slate-100 rounded text-[8px] font-black text-slate-500 uppercase hover:bg-slate-50 transition-all"
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

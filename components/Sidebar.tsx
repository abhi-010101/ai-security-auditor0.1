
import React from 'react';
import { UserRole, User } from '../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, isOpen }) => {
  const currentRole = user.role;

  // STRICT RBAC MENU STRUCTURE
  // UPDATED: "Scan Engines" -> "Security Check", "Dashboard" -> "Summary"
  let menuItems: any[] = [];

  if (currentRole === UserRole.USER) {
    menuItems = [
        { id: 'submit_scan', label: 'Security Check' },
        { id: 'user_dashboard', label: 'Summary' },
        { id: 'my_reports', label: 'My Reports' }, // Reusing reports_overview logic but filtered for user
        { id: 'requests_center', label: 'Track Requests' }
    ];
  } else if (currentRole === UserRole.INFOSEC) {
    menuItems = [
        { id: 'submit_scan', label: 'Ops Center (All Engines)' },
        { id: 'user_dashboard', label: 'Summary' },
        { id: 'approval_queue', label: 'Approval Queue' },
        { id: 'reports_overview', label: 'Global Audit Log' },
        { id: 'knowledge_base', label: 'Knowledge Base' }
    ];
  } else if (currentRole === UserRole.ADMIN) {
     menuItems = [
        { id: 'user_dashboard', label: 'Summary' },
        { id: 'user_management', label: 'User Management' },
        { id: 'reports_overview', label: 'System Audit Log' },
        { id: 'knowledge_base', label: 'Knowledge Base' }
     ];
  }

  return (
    <div className={`w-72 bg-[#003B49] h-screen text-white flex flex-col fixed left-0 top-0 shadow-2xl z-50 border-r border-white/5 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="p-8 border-b border-white/5 bg-[#003038]">
        <div className="flex items-center gap-4">
          <div className="logo-box">
             <span className="logo-symbol">I</span>
             <div className="logo-dot"></div>
          </div>
          <div>
            <h1 className="uni-font text-xl font-bold text-white tracking-tight">INDIRA</h1>
            <p className="text-[9px] text-indira-gold uppercase tracking-[0.3em] font-black">University</p>
          </div>
        </div>
        <div className="bg-white/5 px-3 py-2 rounded mt-6 border border-white/10 flex justify-between items-center">
          <span className="text-[9px] font-black uppercase tracking-widest text-indira-gold">INDIRA AUDITOR v3.0</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-300 text-[10px] lg:text-xs font-black uppercase tracking-widest flex items-center gap-4 relative overflow-hidden ${
              activeTab === item.id 
                ? 'bg-indira-brand text-white shadow-xl shadow-black/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {activeTab === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indira-gold"></div>}
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === item.id ? 'bg-indira-gold' : 'bg-slate-700'}`}></div>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5 bg-[#00282e]">
        <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-indira-gold font-black border border-white/10 overflow-hidden shrink-0">
                {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
                <p className="text-[9px] font-black text-indira-gold uppercase tracking-widest">Active Personnel</p>
                <p className="text-[10px] font-bold text-white uppercase truncate">{user.name}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{user.role}</p>
            </div>
        </div>
        <button 
            onClick={onLogout}
            className="w-full py-2.5 rounded bg-white/5 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
        >
            Terminate Session
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

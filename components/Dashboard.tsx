
import React from 'react';
import { UserRole, Severity, Alert, AgentReport, User } from '../types';

interface DashboardProps {
  role: UserRole;
  alerts: Alert[];
  reports: AgentReport[];
  users?: User[]; // Added users prop for live stats
  onViewReport: (report: AgentReport) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ role, alerts, reports, users, onViewReport }) => {
  
  const StatCard = ({ label, value, color }: any) => (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-4xl font-black text-indira-navy" style={{ color }}>{value}</p>
    </div>
  );

  const isAdmin = role === UserRole.ADMIN;

  // Calculate stats for Admin
  const totalPersonnel = users ? users.length : 0;
  const activeSessions = users ? users.filter(u => u.isOnline).length : 0;
  const infosecCount = users ? users.filter(u => u.role === UserRole.INFOSEC).length : 0;

  return (
    <div className="max-w-7xl mx-auto">
        <header className="mb-10 border-b border-indira-border pb-6">
            <h2 className="text-4xl font-black text-indira-navy uni-font uppercase tracking-tight">
                {isAdmin ? 'Identity Management Hub' : 
                 role === UserRole.INFOSEC ? 'Security Operations Center' : 
                 'Indira Research Portal'}
            </h2>
            <p className="text-indira-gray text-xs mt-1 uppercase tracking-[0.3em] font-black flex items-center gap-3">
                System: UniGuard Core <span className="w-1 h-1 bg-indira-gold rounded-full"></span> 
                {role === UserRole.USER ? 'Personnel Terminal' : 'Authorized Personnel Access'}
            </p>
        </header>

        <div className="grid grid-cols-3 gap-8 mb-12">
            {isAdmin ? (
                <>
                    <StatCard label="Total Personnel" value={totalPersonnel.toString()} />
                    <StatCard label="Active Sessions" value={activeSessions.toString()} color="#10b981" />
                    <StatCard label="Infosec Auditors" value={infosecCount.toString()} color="#006778" />
                </>
            ) : (
                <>
                    <StatCard label="Audit Records" value={reports.length.toString()} />
                    <StatCard label="Verification Rate" value={`${reports.length > 0 ? Math.round((reports.filter(r => r.isApproved).length / reports.length) * 100) : 0}%`} color="#10b981" />
                    <StatCard label="Active Agents" value="5" color="#006778" />
                </>
            )}
        </div>

        {isAdmin && (
            <div className="bg-indira-navy p-12 rounded-2xl border border-indira-navy shadow-xl text-white mb-12">
                <h3 className="text-xl font-black uni-font uppercase mb-4 text-indira-gold">Admin Command Overview</h3>
                <p className="text-sm text-slate-300 mb-8 max-w-2xl leading-relaxed">
                    You are in the Identity Management quadrant. Below is the global security audit ledger containing all system activity. Use the System Audit Log tab for a more detailed tabular view.
                </p>
                <div className="flex gap-4">
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 flex-1">
                        <p className="text-[9px] font-black text-indira-gold uppercase mb-2">System Integrity</p>
                        <p className="text-lg font-bold">LOCKED & VERIFIED</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-xl border border-white/10 flex-1">
                        <p className="text-[9px] font-black text-indira-gold uppercase mb-2">Audit Logs (24h)</p>
                        <p className="text-lg font-bold">{alerts.length + reports.length} ENTRIES</p>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-indira-navy uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-indira-gold"></span>
                Security Orchestration Ledger
            </h3>

            {reports.length === 0 ? (
                <div className="text-center py-32 border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                        {role === UserRole.USER ? 'Deploy a Security Agent to view findings.' : 'No Audit Telemetry Detected'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reports.map((r, i) => (
                        <div 
                            key={i} 
                            onClick={() => onViewReport(r)}
                            className={`p-6 border rounded-xl flex justify-between items-center hover:shadow-lg transition-all cursor-pointer group bg-slate-50/30 ${
                                r.isApproved ? 'border-slate-100 hover:border-indira-brand' : 'border-amber-100 hover:border-amber-400'
                            }`}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${
                                    r.isApproved ? 'bg-indira-navy text-indira-gold group-hover:bg-indira-brand group-hover:text-white' : 'bg-amber-100 text-amber-700'
                                }`}>
                                    NODE
                                </div>
                                <div>
                                    <p className={`font-black text-sm uppercase tracking-tight transition-all ${
                                        r.isApproved ? 'text-indira-navy group-hover:text-indira-brand' : 'text-amber-800'
                                    }`}>
                                        {(r.agentType || 'SECURITY_NODE').replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                                        ID: {r.scanRequestId.slice(-8).toUpperCase()} • {new Date(r.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${
                                    r.isApproved 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                    : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                                }`}>
                                    {r.isApproved ? 'VERIFIED FINDINGS' : 'PENDING VALIDATION'}
                                </span>
                                <svg className={`w-5 h-5 transition-all ${
                                    r.isApproved ? 'text-slate-300 group-hover:text-indira-brand' : 'text-amber-300 group-hover:text-amber-500'
                                } group-hover:translate-x-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default Dashboard;

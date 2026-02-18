
import React from 'react';
import { UserRole, Severity, Alert, AgentReport, User, ReportTier } from '../types';

interface DashboardProps {
  role: UserRole;
  alerts: Alert[];
  reports: AgentReport[];
  users?: User[];
  onViewReport: (report: AgentReport) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ role, alerts, reports, users, onViewReport }) => {
  
  const StatCard = ({ label, value, color }: any) => (
    <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl md:text-4xl font-black text-indira-navy" style={{ color }}>{value}</p>
    </div>
  );

  const getReportStatus = (report: AgentReport) => {
    // Find relevant alerts for this report
    const reportAlerts = alerts.filter(a => a.reportId === report.id);
    
    const isVerified = report.reportTier === ReportTier.VERIFIED;
    const isAdvanced = report.reportTier === ReportTier.ADVANCED;
    
    const verificationRequest = reportAlerts.find(a => a.type === 'verification' && a.status === 'pending_approval');
    const accessRequest = reportAlerts.find(a => a.type === 'access_request' && a.status === 'pending_approval');
    const rejectedVerification = reportAlerts.find(a => a.type === 'verification' && a.status === 'rejected');

    let phase = "Automated Analysis";
    let type = "BASIC REPORT";
    let colorClass = "bg-slate-50 text-slate-500 border-slate-200";

    if (isVerified) {
        type = "VERIFIED REPORT";
        phase = "Audit Finalized";
        colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (verificationRequest) {
        type = isAdvanced ? "ADVANCED REPORT" : "BASIC REPORT";
        phase = "Officer Review Pending";
        colorClass = "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
    } else if (rejectedVerification) {
         type = isAdvanced ? "ADVANCED REPORT" : "BASIC REPORT";
         phase = "Verification Rejected";
         colorClass = "bg-red-50 text-red-700 border-red-200";
    } else if (accessRequest) {
        type = "BASIC REPORT";
        phase = "Access Request Pending";
        colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse";
    } else if (isAdvanced) {
        type = "ADVANCED REPORT";
        phase = "Technical Review";
        colorClass = "bg-blue-50 text-blue-700 border-blue-200";
    }

    return { type, phase, colorClass };
  };

  const isAdmin = role === UserRole.ADMIN;
  const totalPersonnel = users ? users.length : 0;
  const activeSessions = users ? users.filter(u => u.isOnline).length : 0;
  const infosecCount = users ? users.filter(u => u.role === UserRole.INFOSEC).length : 0;

  return (
    <div className="max-w-7xl mx-auto">
        <header className="mb-6 md:mb-10 border-b border-indira-border pb-6">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-indira-navy uni-font uppercase tracking-tight">
                {isAdmin ? 'Identity Management Hub' : 
                 role === UserRole.INFOSEC ? 'Security Operations Center' : 
                 'Indira Research Portal'}
            </h2>
            <p className="text-indira-gray text-[10px] md:text-xs mt-1 uppercase tracking-[0.2em] md:tracking-[0.3em] font-black flex items-center gap-2 md:gap-3">
                System: Indira Auditor Core <span className="w-1 h-1 bg-indira-gold rounded-full"></span> 
                {role === UserRole.USER ? 'Personnel Terminal' : 'Authorized Personnel Access'}
            </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
            {isAdmin ? (
                <>
                    <StatCard label="Total Personnel" value={totalPersonnel.toString()} />
                    <StatCard label="Active Sessions" value={activeSessions.toString()} color="#10b981" />
                    <StatCard label="Infosec Auditors" value={infosecCount.toString()} color="#006778" />
                </>
            ) : (
                <>
                    <StatCard label="Audit Records" value={reports.length.toString()} />
                    <StatCard label="Verification Rate" value={`${reports.length > 0 ? Math.round((reports.filter(r => r.reportTier === ReportTier.VERIFIED).length / reports.length) * 100) : 0}%`} color="#10b981" />
                    <StatCard label="Active Agents" value="5" color="#006778" />
                </>
            )}
        </div>

        {isAdmin && (
            <div className="bg-indira-navy p-6 md:p-12 rounded-2xl border border-indira-navy shadow-xl text-white mb-8 md:mb-12">
                <h3 className="text-lg md:text-xl font-black uni-font uppercase mb-4 text-indira-gold">Admin Command Overview</h3>
                <p className="text-xs md:text-sm text-slate-300 mb-8 max-w-2xl leading-relaxed">
                    You are in the Identity Management quadrant. Below is the global security audit ledger containing all system activity.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="bg-white/5 p-4 md:p-6 rounded-xl border border-white/10 flex-1">
                        <p className="text-[8px] md:text-[9px] font-black text-indira-gold uppercase mb-2">System Integrity</p>
                        <p className="text-base md:text-lg font-bold uppercase tracking-tight">LOCKED & VERIFIED</p>
                    </div>
                    <div className="bg-white/5 p-4 md:p-6 rounded-xl border border-white/10 flex-1">
                        <p className="text-[8px] md:text-[9px] font-black text-indira-gold uppercase mb-2">Audit Logs (24h)</p>
                        <p className="text-base md:text-lg font-bold uppercase tracking-tight">{alerts.length + reports.length} ENTRIES</p>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-[10px] md:text-xs font-black text-indira-navy uppercase tracking-[0.2em] md:tracking-[0.3em] mb-6 md:mb-8 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-indira-gold"></span>
                Security Orchestration Ledger
            </h3>

            {reports.length === 0 ? (
                <div className="text-center py-20 md:py-32 border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-[10px] md:text-xs font-black text-slate-300 uppercase tracking-widest px-4">
                        {role === UserRole.USER ? 'Deploy a Security Agent to view findings.' : 'No Audit Telemetry Detected'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 md:gap-4">
                    {reports.map((r, i) => {
                        const { type, phase, colorClass } = getReportStatus(r);
                        
                        return (
                            <div 
                                key={i} 
                                onClick={() => onViewReport(r)}
                                className={`p-4 md:p-6 border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-lg transition-all cursor-pointer group bg-slate-50/30 ${
                                    r.reportTier === ReportTier.VERIFIED ? 'border-slate-100 hover:border-indira-brand' : 'border-slate-100 hover:border-amber-400'
                                }`}
                            >
                                <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-black text-[9px] md:text-[10px] transition-all shrink-0 ${
                                        r.reportTier === ReportTier.VERIFIED ? 'bg-indira-navy text-indira-gold group-hover:bg-indira-brand group-hover:text-white' : 'bg-white border border-slate-200 text-slate-400'
                                    }`}>
                                        NODE
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className={`font-black text-xs md:text-sm uppercase tracking-tight transition-all truncate ${
                                                r.reportTier === ReportTier.VERIFIED ? 'text-indira-navy group-hover:text-indira-brand' : 'text-slate-700'
                                            }`}>
                                                {(r.agentType || 'SECURITY_NODE').replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                        <p className="text-[9px] md:text-[10px] text-slate-400 font-bold flex items-center gap-2">
                                            <span>ID: {r.scanRequestId.slice(-8).toUpperCase()}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Phase</span>
                                        <span className={`px-2 py-1 rounded text-[8px] md:text-[9px] font-black uppercase border tracking-wide whitespace-nowrap ${colorClass}`}>
                                            {phase}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end hidden md:flex">
                                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Report Type</span>
                                        <span className="text-[8px] md:text-[9px] font-bold text-indira-navy uppercase bg-white border border-slate-200 px-2 py-1 rounded">
                                            {type}
                                        </span>
                                    </div>
                                    
                                    <svg className={`w-5 h-5 transition-all hidden sm:block ml-2 ${
                                        r.reportTier === ReportTier.VERIFIED ? 'text-slate-300 group-hover:text-indira-brand' : 'text-slate-300 group-hover:text-amber-500'
                                    } group-hover:translate-x-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};

export default Dashboard;

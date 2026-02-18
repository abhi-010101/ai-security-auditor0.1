
import React from 'react';
import { AgentReport, Alert, User, ReportTier } from '../types';

interface AdminReportsLogProps {
  reports: AgentReport[];
  alerts: Alert[];
  users: User[];
  currentUser?: User | null;
  onViewReport: (report: AgentReport) => void;
}

const AdminReportsLog: React.FC<AdminReportsLogProps> = ({ reports, alerts, users, currentUser, onViewReport }) => {
  const getUserName = (uid: string) => {
    if (currentUser && currentUser.uid === uid) return currentUser.name;
    const u = users.find(user => user.uid === uid);
    return u ? u.name : 'Unknown User'; 
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <header className="mb-6 md:mb-8">
           <h2 className="text-2xl md:text-3xl font-black text-indira-navy uni-font uppercase">System Audit Log</h2>
           <p className="text-indira-gray text-[10px] md:text-xs mt-1 uppercase tracking-widest font-bold">Comprehensive Scan History & Authorization Trail</p>
       </header>

       <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left min-w-[800px]">
               <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                   <th className="px-4 md:px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Timestamp / ID</th>
                   <th className="px-4 md:px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Target Asset</th>
                   <th className="px-4 md:px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Requester</th>
                   <th className="px-4 md:px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Report Type</th>
                   <th className="px-4 md:px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Authorized By</th>
                   <th className="px-4 md:px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {reports.map((report, idx) => {
                    const requesterName = getUserName(report.created_by);
                    const isVerified = report.reportTier === ReportTier.VERIFIED;
                    
                    const verificationPending = alerts.find(a => a.reportId === report.id && a.type === 'verification' && a.status === 'pending_approval');
                    const verificationRejected = alerts.find(a => a.reportId === report.id && a.type === 'verification' && a.status === 'rejected');
                    
                    let statusLabel = 'BASIC REPORT';
                    let statusStyle = 'bg-slate-50 text-slate-400 border-slate-100';
                    let approverName = isVerified ? (report.verifiedBy || 'Officer') : '-';
                    let isRejected = false;

                    if (isVerified) {
                        statusLabel = 'VERIFIED REPORT';
                        statusStyle = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                    } else if (verificationRejected) {
                        statusLabel = 'VERIFICATION REJECTED';
                        statusStyle = 'bg-red-50 text-red-600 border-red-100';
                        approverName = verificationRejected.approvedBy || 'Infosec';
                        isRejected = true;
                    } else if (verificationPending) {
                        statusLabel = 'REVIEW PENDING';
                        statusStyle = 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse';
                    } else if (report.reportTier === ReportTier.ADVANCED) {
                        statusLabel = 'ADVANCED REPORT';
                        statusStyle = 'bg-indigo-50 text-indigo-600 border-indigo-100';
                    }
                    
                    // Fallback key ensures render doesn't crash if ID is missing
                    const rowKey = report.id || `report-fallback-${idx}-${Date.now()}`;

                    return (
                      <tr key={rowKey} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 md:px-6 py-4">
                            <p className="text-[11px] md:text-xs font-bold text-indira-navy">{new Date(report.created_at).toLocaleDateString()}</p>
                            <p className="text-[8px] md:text-[9px] font-mono text-slate-400 uppercase tracking-wider">{report.scanRequestId.slice(-8).toUpperCase()}</p>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                            <p className="text-[11px] md:text-xs font-bold text-slate-700 truncate max-w-[150px] md:max-w-[200px]" title={report.target}>{report.target}</p>
                            <p className="text-[8px] md:text-[9px] text-slate-400 uppercase tracking-tight">{report.agentType.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-indira-navy/5 flex items-center justify-center text-[9px] font-black text-indira-navy border border-indira-navy/10 shrink-0">
                                    {requesterName.charAt(0)}
                                </div>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-600 truncate max-w-[100px]">{requesterName}</p>
                            </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase border tracking-wide whitespace-nowrap ${statusStyle}`}>
                                {statusLabel}
                            </span>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                             {approverName !== '-' ? (
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    {isRejected ? (
                                        <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    ) : (
                                        <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    )}
                                    <span className="text-[9px] md:text-[10px] font-bold text-slate-600">{approverName}</span>
                                </div>
                             ) : (
                                <span className="text-[9px] md:text-[10px] text-slate-300 font-mono">--</span>
                             )}
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right">
                            <button 
                                onClick={() => onViewReport(report)}
                                className="text-[8px] md:text-[9px] font-black uppercase text-indira-brand hover:text-indira-navy hover:underline tracking-widest transition-all"
                            >
                                Open
                            </button>
                        </td>
                      </tr>
                    );
                 })}
               </tbody>
             </table>
         </div>
         {reports.length === 0 && (
            <div className="p-12 md:p-20 text-center border-t border-slate-100">
                <p className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 md:mb-2">System Ledger Empty</p>
                <p className="text-[8px] md:text-[10px] text-slate-300">No security audits have been initialized.</p>
            </div>
         )}
       </div>
    </div>
  );
};

export default AdminReportsLog;

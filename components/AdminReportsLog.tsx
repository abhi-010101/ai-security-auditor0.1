
import React from 'react';
import { AgentReport, Alert, User } from '../types';

interface AdminReportsLogProps {
  reports: AgentReport[];
  alerts: Alert[];
  users: User[];
  onViewReport: (report: AgentReport) => void;
}

const AdminReportsLog: React.FC<AdminReportsLogProps> = ({ reports, alerts, users, onViewReport }) => {
  const getUserName = (uid: string) => {
    const u = users.find(user => user.uid === uid);
    return u ? u.name : 'Unknown User'; 
  };

  const getApprovalStatus = (reportId: string | undefined) => {
    if (!reportId) return { status: 'Unknown', approver: '-' };
    const alert = alerts.find(a => a.reportId === reportId);
    if (!alert) {
         return { status: 'N/A', approver: '-' };
    }
    return {
        status: alert.status,
        approver: alert.approvedBy || '-'
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <header className="mb-8">
           <h2 className="text-3xl font-black text-indira-navy uni-font uppercase">System Audit Log</h2>
           <p className="text-indira-gray text-xs mt-1 uppercase tracking-widest font-bold">Comprehensive Scan History & Authorization Trail</p>
       </header>

       <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-100">
                 <tr>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Timestamp / ID</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Target Asset</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Requester</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Workflow Status</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Authorized By</th>
                   <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {reports.map(report => {
                    const { status, approver } = getApprovalStatus(report.id);
                    const requesterName = getUserName(report.created_by);
                    
                    return (
                      <tr key={report.id || Math.random()} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                            <p className="text-xs font-bold text-indira-navy">{new Date(report.created_at).toLocaleDateString()}</p>
                            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{report.scanRequestId.slice(-8).toUpperCase()}</p>
                        </td>
                        <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-700 truncate max-w-[180px]" title={report.target}>{report.target}</p>
                            <p className="text-[9px] text-slate-400 uppercase tracking-tight">{report.agentType.replace(/_/g, ' ')}</p>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-indira-navy/5 flex items-center justify-center text-[9px] font-black text-indira-navy border border-indira-navy/10">
                                    {requesterName.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600">{requesterName}</p>
                                    <p className="text-[8px] font-mono text-slate-400">{report.created_by.slice(0,8)}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase border tracking-wide ${
                                status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                status === 'pending_approval' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' :
                                'bg-slate-50 text-slate-400 border-slate-100'
                            }`}>
                                {status === 'pending_approval' ? 'Pending Review' : status}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                             {approver !== '-' ? (
                                <div className="flex items-center gap-2">
                                    <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    <span className="text-[10px] font-bold text-slate-600">{approver}</span>
                                </div>
                             ) : (
                                <span className="text-[10px] text-slate-300 font-mono">--</span>
                             )}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button 
                                onClick={() => onViewReport(report)}
                                className="text-[9px] font-black uppercase text-indira-brand hover:text-indira-navy hover:underline tracking-widest transition-all"
                            >
                                Open Ledger
                            </button>
                        </td>
                      </tr>
                    );
                 })}
               </tbody>
             </table>
         </div>
         {reports.length === 0 && (
            <div className="p-20 text-center border-t border-slate-100">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">System Ledger Empty</p>
                <p className="text-[10px] text-slate-300">No security audits have been initialized.</p>
            </div>
         )}
       </div>
    </div>
  );
};

export default AdminReportsLog;

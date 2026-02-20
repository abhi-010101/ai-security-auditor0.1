
import React, { useState } from 'react';
import { SecurityFinding, Alert, Severity, UserRole, AgentReport } from '../types';
import { COLORS } from '../constants';

interface RequestCenterProps {
  role: UserRole;
  alerts: Alert[]; // Alerts function as request tickets here
  reports: AgentReport[];
  onApprove: (alertId: string) => void;
  onReject: (alertId: string, reason?: string) => void;
}

interface CardProps {
  request: Alert;
  report: AgentReport;
  role: UserRole;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}

const AccessRequestCard: React.FC<CardProps> = ({ request, report, role, onApprove, onReject }) => (
    <div className="bg-white border-2 border-indigo-50 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6">
        <div className="w-1.5 bg-indigo-500 rounded-full self-stretch"></div>
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase px-2 py-1 rounded">Advanced Access Request</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(request.created_at).toLocaleDateString()}</span>
            </div>
            <h3 className="text-lg font-black text-indira-navy mb-1">{request.summary}</h3>
            <p className="text-xs text-slate-600 font-medium mb-3">{request.description}</p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px] text-slate-500 font-mono">
                Target: {report.target} <br/>
                Engine: {report.agentType}
            </div>
        </div>
        <div className="flex flex-col justify-center gap-2 min-w-[120px]">
            {role === UserRole.INFOSEC || role === UserRole.ADMIN ? (
                <>
                  <button onClick={() => onApprove(request.id!)} className="w-full py-2 bg-indigo-600 text-white rounded text-[9px] font-black uppercase hover:bg-indigo-700">Grant Access</button>
                  <button onClick={() => onReject(request.id!)} className="w-full py-2 border border-slate-200 text-slate-500 rounded text-[9px] font-black uppercase hover:bg-slate-50">Deny</button>
                </>
            ) : (
                <div className="text-center py-2 bg-slate-100 text-slate-400 rounded text-[9px] font-black uppercase">
                    Under Review
                </div>
            )}
        </div>
    </div>
);

const QueryTicketCard: React.FC<CardProps> = ({ request, report, role, onApprove }) => (
    <div className="bg-white border-2 border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 hover:border-indira-brand/20 transition-all">
        <div className="w-1.5 bg-indira-gold rounded-full self-stretch"></div>
        <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-indira-subtle text-indira-navy text-[8px] font-black uppercase px-2 py-1 rounded border border-indira-navy/10">User Support Ticket</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(request.created_at).toLocaleDateString()}</span>
            </div>
            <h3 className="text-lg font-black text-indira-navy mb-2">Query Regarding Audit #{report.scanRequestId.slice(-4).toUpperCase()}</h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                <span className="block text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">User Question:</span>
                <p className="text-xs text-slate-700 font-medium italic">"{request.description}"</p>
            </div>
            <p className="text-[9px] text-slate-400 font-mono">Target Asset: {report.target}</p>
        </div>
        <div className="flex flex-col justify-center gap-2 min-w-[120px]">
            {role === UserRole.INFOSEC || role === UserRole.ADMIN ? (
                 <button onClick={() => onApprove(request.id!)} className="w-full py-3 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase hover:bg-slate-900 shadow-sm">
                    Mark Resolved
                 </button>
            ) : (
                <div className="text-center py-2 bg-slate-50 text-slate-400 rounded text-[9px] font-black uppercase border border-slate-100">
                    Ticket Open
                </div>
            )}
        </div>
    </div>
);

const VerificationRequestCard: React.FC<CardProps> = ({ request, report, role, onApprove, onReject }) => {
    const [isRejecting, setIsRejecting] = useState(false);
    const [reason, setReason] = useState("");

    const handleConfirmReject = () => {
        if (!reason.trim()) {
            alert("Please provide a reason for rejection to maintain transparency.");
            return;
        }
        onReject(request.id!, reason);
        setIsRejecting(false);
    };

    return (
        <div className="bg-white border-2 border-emerald-50 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-1.5 bg-emerald-500 rounded-full self-stretch hidden md:block"></div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase px-2 py-1 rounded">Human Verification Request</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-black text-indira-navy mb-1">{request.summary}</h3>
                    <p className="text-xs text-slate-600 font-medium mb-3">{request.description}</p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px] text-slate-500 font-mono">
                        Target: {report.target} <br/>
                        Original Score: {report.healthScore}/100
                    </div>
                </div>
                
                {/* ACTION COLUMN */}
                <div className="flex flex-col justify-center gap-2 min-w-[140px]">
                    {role === UserRole.INFOSEC || role === UserRole.ADMIN ? (
                        !isRejecting ? (
                            <>
                                <button onClick={() => onApprove(request.id!)} className="w-full py-3 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-emerald-700 shadow-sm transition-all">
                                    Verify & Seal
                                </button>
                                <button onClick={() => setIsRejecting(true)} className="w-full py-3 border border-red-200 text-red-500 rounded-lg text-[9px] font-black uppercase hover:bg-red-50 transition-all">
                                    Reject
                                </button>
                            </>
                        ) : null
                    ) : (
                        <div className="text-center py-2 bg-slate-100 text-slate-400 rounded text-[9px] font-black uppercase">
                            Pending Audit
                        </div>
                    )}
                </div>
            </div>

            {/* REJECTION REASON INPUT AREA */}
            {isRejecting && (
                <div className="mt-2 bg-red-50/50 p-4 rounded-xl border border-red-100 animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-[8px] font-black uppercase text-red-800 tracking-widest mb-2">
                        Official Rejection Note (Required)
                    </label>
                    <textarea 
                        className="w-full p-3 text-xs border border-red-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-red-200 text-slate-700 font-medium mb-3"
                        rows={2}
                        placeholder="Explain why this verification request is being denied (e.g. 'Insufficient remediation', 'Pending external review')..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                        <button 
                            onClick={() => setIsRejecting(false)} 
                            className="px-4 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmReject} 
                            className="px-6 py-2 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-red-700 shadow-sm"
                        >
                            Confirm Denial
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const RequestCenter: React.FC<RequestCenterProps> = ({ role, alerts, reports, onApprove, onReject }) => {
  
  const pendingRequests = alerts.filter(a => a.status === 'pending_approval');
  
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
      <header className="mb-8 border-b border-indira-border pb-6">
           <h2 className="text-2xl md:text-3xl font-black text-indira-navy uni-font uppercase">
               {role === UserRole.INFOSEC ? 'Request & Approval Center' : 'My Requests Status'}
           </h2>
           <p className="text-indira-gray text-[10px] md:text-xs mt-1 uppercase tracking-widest font-bold">
               {role === UserRole.INFOSEC ? 'Manage Access Control & Verification Queues' : 'Track advanced report & verification tickets'}
           </p>
       </header>

      {pendingRequests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-indira-gray font-black uppercase tracking-widest text-[10px] lg:text-xs">No Pending Requests</p>
          </div>
      ) : (
          <div className="grid gap-6">
              {pendingRequests.map(request => {
                  const report = reports.find(r => r.id === request.reportId);
                  if (!report) return null;

                  if (request.type === 'access_request') {
                      return <AccessRequestCard key={request.id} request={request} report={report} role={role} onApprove={onApprove} onReject={onReject} />
                  } else if (request.type === 'query') {
                      return <QueryTicketCard key={request.id} request={request} report={report} role={role} onApprove={onApprove} onReject={onReject} />
                  } else {
                      return <VerificationRequestCard key={request.id} request={request} report={report} role={role} onApprove={onApprove} onReject={onReject} />
                  }
              })}
          </div>
      )}
    </div>
  );
};

export default RequestCenter;


import React from 'react';
import { SecurityFinding, CorrelationReport, Severity } from '../types';
import { COLORS } from '../constants';

interface ApprovalQueueProps {
  findings: SecurityFinding[];
  correlation?: CorrelationReport;
  onApproveFinding: (id: string) => void;
  onRejectFinding: (id: string) => void;
  onApproveReport: () => void;
}

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ findings, correlation, onApproveFinding, onRejectFinding, onApproveReport }) => {
  const pendingFindings = findings.filter(f => !f.approved);
  
  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-500">
      {correlation && correlation.status !== 'APPROVED' && (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-2xl relative group">
          <div className="bg-[#003B49] p-10 flex justify-between items-center text-white">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] bg-white/10 px-4 py-2 rounded-lg">Orchestrator Analysis</span>
              <h3 className="text-3xl font-black mt-4 uni-font">Risk Correlation Engine</h3>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Risk Index</p>
              <p className="text-5xl font-black text-indira-gold">{correlation.overallRiskScore}%</p>
            </div>
          </div>
          
          <div className="p-12 space-y-10">
             <div className="bg-slate-50 p-10 rounded-xl border-l-8 border-[#003B49] italic font-bold text-slate-700 leading-relaxed text-xl shadow-inner">
                "{correlation.summary}"
             </div>

             <div className="bg-indira-navy/5 p-8 rounded-xl border border-indira-navy/10">
                <h4 className="text-[10px] font-black text-indira-navy uppercase tracking-widest mb-6">Expert Reasoning</h4>
                <p className="text-base text-slate-600 leading-relaxed font-semibold">{correlation.reasoning}</p>
             </div>

             <button 
                onClick={onApproveReport}
                className="w-full py-6 bg-indira-gold text-indira-navy font-black uppercase tracking-[0.3em] text-xs rounded-xl hover:bg-indira-navy hover:text-white transition-all shadow-xl"
            >
                Authorize Publication to User Ledger
            </button>
          </div>
        </div>
      )}

      {pendingFindings.length > 0 && (
        <div className="space-y-8">
          <div className="flex items-center gap-4 border-b pb-6">
             <h3 className="text-xl font-black text-indira-navy uppercase tracking-tight">Isolated Agent Findings</h3>
          </div>
          <div className="grid gap-6">
            {pendingFindings.map(finding => (
              <div key={finding.id} className="bg-white p-10 rounded-2xl border border-slate-200 flex gap-8">
                <div className="w-2 rounded-full h-auto" style={{ backgroundColor: COLORS.SEVERITY[finding.severity] }}></div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border-2" style={{ color: COLORS.SEVERITY[finding.severity], borderColor: COLORS.SEVERITY[finding.severity] + '40' }}>{finding.severity} SEVERITY</span>
                  </div>
                  <h4 className="text-xl font-black text-indira-navy mb-3">{finding.title}</h4>
                  <p className="text-slate-600 mb-8 text-sm font-medium leading-relaxed">{finding.description}</p>
                  
                  <div className="flex gap-4">
                      <button onClick={() => onApproveFinding(finding.id)} className="px-8 py-3 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Verify</button>
                      <button onClick={() => onRejectFinding(finding.id)} className="px-8 py-3 border border-slate-200 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest">Dismiss</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;

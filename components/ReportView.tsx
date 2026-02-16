
import React from 'react';
import { AgentReport, Alert, Severity, UserRole } from '../types';
import { COLORS } from '../constants';

interface ReportViewProps {
  report: AgentReport;
  alert?: Alert;
  role: UserRole;
  onBack: () => void;
  onApprove?: (alertId: string) => void;
  onReject?: (alertId: string) => void;
}

const ReportView: React.FC<ReportViewProps> = ({ report, alert, role, onBack, onApprove, onReject }) => {
  
  const handleDownloadPDF = () => {
    const element = document.getElementById('printable-report');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `Indira_Audit_${report.scanRequestId}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    const html2pdf = (window as any).html2pdf;
    if (html2pdf) {
        html2pdf().set(opt).from(element).save();
    } else {
        window.print();
    }
  };

  const severityColor = (sev: Severity) => {
    switch (sev) {
      case Severity.CRITICAL: return 'text-red-600 bg-red-50 border-red-200';
      case Severity.HIGH: return 'text-orange-600 bg-orange-50 border-orange-200';
      case Severity.MEDIUM: return 'text-indira-gold bg-amber-50 border-amber-200';
      case Severity.LOW: return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  // Health Score Color Logic
  const healthColor = (score: number | undefined) => {
      if (score === undefined) return 'text-slate-400';
      if (score >= 90) return 'text-emerald-500';
      if (score >= 75) return 'text-emerald-600';
      if (score >= 50) return 'text-amber-500';
      return 'text-red-600';
  };

  return (
    <div className="animate-in fade-in duration-300 pb-20 pt-8 px-8">
      {/* ACTION BAR (Fixed) */}
      <div className="flex justify-between items-center mb-8 no-print sticky top-0 bg-white/95 backdrop-blur z-50 py-4 border-b border-indira-border px-4 rounded-xl shadow-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-indira-navy hover:text-indira-brand font-black text-xs uppercase tracking-[0.2em] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Exit Report
        </button>
        <div className="flex gap-4">
            <button onClick={() => window.print()} className="bg-white border-2 border-indira-border text-indira-navy px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indira-subtle transition-all">
                Print
            </button>
            <button onClick={handleDownloadPDF} className="bg-indira-navy text-white px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indira-brand transition-all flex items-center gap-2 shadow-xl shadow-indira-navy/20 border-2 border-indira-navy">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Export PDF
            </button>
        </div>
      </div>

      {/* REPORT CONTENT */}
      <div id="printable-report" className="report-container bg-white max-w-5xl mx-auto shadow-2xl rounded-xl overflow-hidden border border-indira-border print:border-none print:shadow-none">
        
        {/* HEADER BLOCK */}
        <header className="brand-gradient p-12 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10 flex justify-between items-end">
                <div className="flex gap-8 items-center">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                        <span className="logo-symbol text-5xl">I</span>
                        <div className="w-3 h-3 bg-indira-gold rounded-full absolute top-4 right-4 shadow-lg"></div>
                    </div>
                    <div>
                        <h1 className="uni-font text-5xl font-black tracking-tighter text-white mb-2">Security Audit Ledger</h1>
                        <p className="text-indira-gold/90 text-xs font-black uppercase tracking-[0.5em] flex items-center gap-3">
                            Indira University <span className="w-1 h-1 bg-white/20 rounded-full"></span> Internal Compliance Control
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="bg-black/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-right">
                        <p className="text-[9px] text-indira-gold uppercase tracking-[0.3em] font-black mb-1">Authorization Token</p>
                        <p className="font-mono text-lg font-black tracking-widest text-white">{report.scanRequestId.slice(-12).toUpperCase()}</p>
                    </div>
                </div>
            </div>
        </header>

        {/* METADATA STRIP */}
        <div className="bg-indira-subtle/80 border-b border-indira-border px-12 py-6 grid grid-cols-4 gap-8">
            <div>
                <span className="text-indira-gray font-black uppercase tracking-widest block mb-1 text-[9px]">Timestamp</span>
                <span className="text-indira-navy font-bold text-sm">{new Date(report.created_at).toLocaleString()}</span>
            </div>
            <div>
                <span className="text-indira-gray font-black uppercase tracking-widest block mb-1 text-[9px]">Audit Engine</span>
                <span className="text-indira-navy font-bold text-sm uppercase">{report.agentType.replace(/_/g, ' ')}</span>
            </div>
            <div className="col-span-2">
                <span className="text-indira-gray font-black uppercase tracking-widest block mb-1 text-[9px]">Target Artifact / Identity</span>
                <span className="text-indira-navy font-mono font-bold text-sm truncate block">{report.target || "N/A"}</span>
            </div>
        </div>

        <div className="p-12 space-y-16">
            
            {/* BRAIN REASONING / EXECUTIVE SUMMARY */}
            <section className="print-break-inside">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-indira-navy flex items-center justify-center text-indira-gold shadow-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h2 className="text-xl font-black text-indira-navy uppercase tracking-tight">Post-Correlation Intelligence</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-3xl border-2 border-indira-brand/10 shadow-sm relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indira-brand group-hover:w-2 transition-all"></div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indira-brand mb-4">Central Brain Reasoning</h3>
                            <p className="text-base text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap">
                                {report.summary}
                            </p>
                        </div>
                        <div className="bg-indira-navy text-white p-8 rounded-3xl shadow-xl border border-indira-navy">
                             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indira-gold mb-4">Strategic Impact Analysis</h3>
                             <p className="text-sm text-slate-200 leading-relaxed font-medium">
                                {report.reasoning}
                             </p>
                             {report.compoundThreat && (
                                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Compound Threat Escalation Detected</span>
                                </div>
                             )}
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-3xl border border-indira-border text-center shadow-sm">
                            <p className="text-[10px] text-indira-gray uppercase tracking-widest font-black mb-4">System Health Score</p>
                            <div className={`text-6xl font-black mb-2 ${healthColor(report.healthScore)}`}>
                                {report.healthScore ?? '--'}
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                Risk Weight: {report.weightedRiskScore ?? 0}/100
                            </p>
                        </div>

                        <div className="bg-indira-subtle/50 p-8 rounded-3xl border border-indira-border">
                            <h4 className="text-[10px] font-black text-indira-navy uppercase tracking-widest mb-4">Integrity Metrics</h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                                        <span className="text-indira-gray">Confidence Score</span>
                                        <span className="text-indira-navy">92%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-indira-brand w-[92%]"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                                        <span className="text-indira-gray">False Positive Risk</span>
                                        <span className="text-indira-navy">Low</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-[15%]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* DETAILED FINDINGS */}
            <section className="print-break-inside">
                <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-indira-border">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indira-brand flex items-center justify-center text-white shadow-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        </div>
                        <h2 className="text-xl font-black text-indira-navy uppercase tracking-tight">Validated Technical Observations</h2>
                    </div>
                    <span className="bg-indira-navy text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                        {report.findings.length} Distinct Items
                    </span>
                </div>
                
                <div className="space-y-8">
                    {report.findings.map((finding, idx) => (
                        <div key={idx} className="bg-white border-2 border-slate-100 rounded-[32px] overflow-hidden hover:border-indira-brand/30 transition-all group shadow-sm print:break-inside-avoid">
                            <div className="bg-slate-50/80 p-6 flex justify-between items-center border-b border-slate-100">
                                <div className="flex items-center gap-6">
                                    <span className="w-8 h-8 rounded-lg bg-indira-navy text-white flex items-center justify-center text-[10px] font-black font-mono">#{idx + 1}</span>
                                    <div>
                                        <h3 className="font-black text-indira-navy text-base tracking-tight">{finding.title}</h3>
                                        <p className="text-[9px] text-indira-gray font-black uppercase tracking-[0.2em] mt-0.5">{finding.category || "Vulnerability Pattern"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {finding.cvss_score && (
                                        <span className="px-3 py-1 bg-slate-800 text-white rounded font-mono text-[9px] font-bold">
                                            CVSS {finding.cvss_score}
                                        </span>
                                    )}
                                    <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full border-2 ${severityColor(finding.severity)}`}>
                                        {finding.severity}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
                                    <div>
                                        <h4 className="text-[9px] font-black uppercase text-indira-gray tracking-[0.3em] mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                            Technical Description
                                        </h4>
                                        <p className="text-sm text-slate-700 leading-relaxed font-semibold">{finding.description}</p>
                                        
                                        {finding.cvss_vector && (
                                            <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg font-mono text-[9px] text-slate-500 break-all">
                                                <span className="font-bold text-indira-navy block mb-1">CVSS VECTOR:</span>
                                                {finding.cvss_vector}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-[9px] font-black uppercase text-indira-gray tracking-[0.3em] mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                            Potential Security Impact
                                        </h4>
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium italic bg-red-50/30 p-4 rounded-2xl border border-red-100/30">
                                            {finding.impact || "Exploitation could lead to unauthorized system access or data exfiltration."}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="bg-emerald-50 p-8 rounded-[24px] border-2 border-emerald-100 relative group/rem">
                                    <div className="absolute top-4 right-6 text-[9px] font-black text-emerald-800 uppercase tracking-widest opacity-30">Remediation Guide</div>
                                    <h4 className="text-[9px] font-black uppercase text-emerald-800 tracking-[0.3em] mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                                        Correction Protocol
                                    </h4>
                                    <p className="text-sm text-emerald-950 font-bold leading-relaxed">{finding.remediation}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* AUDIT AUTHENTICATION */}
            <section className="print-break-inside border-t-2 border-indira-border pt-12 mt-20">
                 <div className="grid grid-cols-2 gap-20">
                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indira-navy uppercase tracking-[0.3em] mb-2">Certification & Status</h4>
                        {alert?.status === 'approved' ? (
                            <div className="border-2 border-emerald-200 bg-emerald-50/50 p-8 rounded-[32px] flex items-start gap-6">
                                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shrink-0">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div>
                                    <p className="text-emerald-900 font-black text-sm uppercase tracking-tight mb-1">Audit Validated</p>
                                    <p className="text-[10px] text-emerald-700 font-bold">Authenticated By: {alert.approvedBy || 'Senior Infosec Officer'}</p>
                                    <p className="text-[10px] text-emerald-600/70 font-mono mt-2">{alert.approvedAt ? new Date(alert.approvedAt).toUTCString() : 'N/A'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="border-2 border-amber-200 bg-amber-50/50 p-8 rounded-[32px] flex items-start gap-6">
                                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg shrink-0">
                                    <svg className="w-7 h-7 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </div>
                                <div>
                                    <p className="text-amber-900 font-black text-sm uppercase tracking-tight mb-1">Human Review Pending</p>
                                    <p className="text-[10px] text-amber-700 font-bold tracking-wide">Awaiting Peer Authorization for University Ledger Publication.</p>
                                </div>
                            </div>
                        )}
                     </div>
                     <div className="text-right flex flex-col justify-end">
                        <div className="mb-10">
                            <h4 className="text-[10px] font-black text-indira-navy uppercase tracking-[0.3em] mb-4">Official Endorsement</h4>
                            <div className="inline-block border-b-2 border-slate-300 w-64 h-12 relative">
                                <div className="uni-font text-3xl text-indira-brand italic absolute bottom-0 left-0 opacity-40">UniGuard Core AI</div>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Digital Auditor Signature</p>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold">This is a generated security audit document from the Indira University Secure Infrastructure. Redistribution of this document without proper authorization is strictly prohibited under Policy v2.4.</p>
                     </div>
                 </div>
            </section>
        </div>

        {/* INFOSEC CONTROL PANEL (No Print) */}
        {role === UserRole.INFOSEC && alert?.status === 'pending_approval' && (
            <div className="brand-gradient p-10 no-print flex justify-between items-center rounded-b-xl">
                <div className="text-white">
                    <h4 className="font-black text-xl tracking-tight mb-1">Officer Intervention Required</h4>
                    <p className="text-xs font-bold text-indira-gold/80 uppercase tracking-widest">Confirm findings to publish to global audit trail</p>
                </div>
                <div className="flex gap-6">
                     <button 
                        onClick={() => onReject && alert && onReject(alert.id)}
                        className="bg-white/5 border-2 border-white/20 text-white hover:bg-red-500 hover:border-red-500 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all"
                     >
                        Reject & Log
                     </button>
                     <button 
                        onClick={() => onApprove && alert && onApprove(alert.id)}
                        className="bg-indira-gold text-indira-navy px-12 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white hover:text-indira-brand transition-all shadow-2xl shadow-indira-gold/20"
                     >
                        Authorize Report
                     </button>
                </div>
            </div>
        )}
      </div>
      
      {/* PRINT-ONLY FOOTER PAGE NUMBERS */}
      <div className="hidden print:block fixed bottom-8 right-8 text-[10px] font-mono text-slate-400">
          CONFIDENTIAL // IU-SOC-{report.scanRequestId.slice(-8).toUpperCase()}
      </div>
    </div>
  );
};

export default ReportView;

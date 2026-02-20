
import React, { useState, useEffect } from 'react';
import { AgentReport, Alert, Severity, UserRole, ReportTier, AccessRequestStatus } from '../types';
import { db } from '../services/firebase';

interface ReportViewProps {
  report: AgentReport;
  alert?: Alert; // The alert associated with verification or access request
  role: UserRole;
  onBack: () => void;
  onApprove?: (alertId: string) => void;
  onReject?: (alertId: string, reason?: string) => void;
}

const ReportView: React.FC<ReportViewProps> = ({ report, alert, role, onBack, onApprove, onReject }) => {
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [requestingVerification, setRequestingVerification] = useState(false);
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [querySent, setQuerySent] = useState(false);
  
  // OPTIMISTIC UI STATE
  const [optimisticTier, setOptimisticTier] = useState<ReportTier | null>(null);
  const [optimisticVerification, setOptimisticVerification] = useState<string | null>(null);

  // Determine effective tier (Local override takes precedence for speed)
  const displayTier = optimisticTier || report.reportTier;
  
  // Reset optimistic state if the actual report updates from DB to match or exceed
  useEffect(() => {
    if (report.reportTier === ReportTier.VERIFIED) setOptimisticTier(null);
    if (report.reportTier === ReportTier.ADVANCED && optimisticTier === ReportTier.ADVANCED) setOptimisticTier(null);
  }, [report.reportTier]);

  // LOGIC: Who can see what?
  const canSeeTechnical = role === UserRole.ADMIN || role === UserRole.INFOSEC || displayTier === ReportTier.ADVANCED || displayTier === ReportTier.VERIFIED;
  const isVerified = displayTier === ReportTier.VERIFIED;
  
  // Verification Status Logic (Optimistic > Alert Prop)
  const verificationStatus = optimisticVerification || alert?.status;

  const handleRequestAdvanced = async () => {
    setRequestingAccess(true);
    setOptimisticTier(ReportTier.ADVANCED);
    await db.requestAdvancedReport(report.id as string);
    setTimeout(() => setRequestingAccess(false), 500);
  };

  const handleRequestVerify = async () => {
    setRequestingVerification(true);
    setOptimisticVerification('pending_approval');
    await db.requestVerification(report.id as string);
    setRequestingVerification(false);
  };

  const handleSubmitQuery = async () => {
      if (!queryText.trim()) return;
      setSubmittingQuery(true);
      await db.submitReportQuery(report.id as string, queryText);
      setSubmittingQuery(false);
      setQuerySent(true);
      setShowQueryForm(false);
      setQueryText("");
  };

  const handleDownloadPDF = () => {
    if (!canSeeTechnical) {
        window.alert("Detailed PDF is available only for Advanced Reports.");
        return;
    }
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
    if (html2pdf) html2pdf().set(opt).from(element).save();
    else window.print();
  };

  // UPDATED SCORE LOGIC
  const getStatusConfig = (score: number | undefined) => {
    if (score === undefined) return { 
        color: 'text-slate-400', 
        label: 'ANALYZING', 
        desc: 'Processing security metrics...', 
        borderColor: 'border-slate-200',
        bgColor: 'bg-slate-50',
        iconColor: 'bg-slate-400'
    };
    
    // SAFE: Above 60
    if (score > 60) {
        return {
            color: 'text-emerald-600',
            label: 'SAFE',
            desc: 'This content appears safe. You can proceed.',
            borderColor: 'border-emerald-500',
            bgColor: 'bg-emerald-50',
            iconColor: 'bg-emerald-500'
        };
    }
    // MAYBE: 46 - 60
    if (score > 45) {
        return {
            color: 'text-amber-600',
            label: 'UNCERTAIN',
            desc: 'Potential risks detected. Proceed with care.',
            borderColor: 'border-amber-500',
            bgColor: 'bg-amber-50',
            iconColor: 'bg-amber-500'
        };
    }
    // UNSAFE: 0 - 45
    return {
        color: 'text-red-700',
        label: 'UNSAFE',
        desc: 'High risk detected. Do not use this content.',
        borderColor: 'border-red-500',
        bgColor: 'bg-red-50',
        iconColor: 'bg-red-600'
    };
  };

  const statusConfig = getStatusConfig(report.healthScore);

  return (
    <div className="animate-in fade-in duration-300 pb-20 pt-4 md:pt-8 px-4 md:px-8">
      {/* ACTION BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 no-print sticky top-0 bg-white/95 backdrop-blur z-50 py-3 md:py-4 border-b border-indira-border px-4 rounded-xl shadow-sm gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-indira-navy hover:text-indira-brand font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back
        </button>
        <div className="flex gap-2 md:gap-4 w-full sm:w-auto">
            {canSeeTechnical && (
                 <>
                    <button onClick={() => window.print()} className="flex-1 sm:flex-none bg-white border-2 border-indira-border text-indira-navy px-4 md:px-6 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indira-subtle">
                        Print
                    </button>
                    <button onClick={handleDownloadPDF} className="flex-1 sm:flex-none bg-indira-navy text-white px-4 md:px-8 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indira-brand flex items-center justify-center gap-2 shadow-xl border-2 border-indira-navy">
                        Export PDF
                    </button>
                 </>
            )}
        </div>
      </div>

      {/* REPORT CONTAINER */}
      <div id="printable-report" className="report-container bg-white max-w-5xl mx-auto shadow-2xl rounded-xl overflow-hidden border border-indira-border print:border-none print:shadow-none relative">
        
        {/* VERIFIED SEAL (Stamp Style) */}
        {isVerified && (
            <div className="absolute top-8 right-8 md:top-10 md:right-12 z-30 pointer-events-none select-none animate-in zoom-in duration-500">
                <div className="transform -rotate-[10deg] border-[6px] border-emerald-500 rounded-xl px-4 py-2 flex flex-col items-center justify-center bg-emerald-500/10 shadow-sm backdrop-blur-[1px] w-56 md:w-80 border-double">
                     {/* Top Text */}
                    <div className="flex items-center gap-2 md:gap-3 mb-1 border-b-2 border-emerald-500/40 pb-1 w-full justify-center">
                        <svg className="w-3 h-3 md:w-4 md:h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        <span className="text-emerald-700 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em]">Indira Audit</span>
                    </div>
                    
                    {/* Main Text */}
                    <h2 className="text-4xl md:text-6xl font-black text-emerald-500 uppercase tracking-tighter leading-none my-1" 
                        style={{ fontFamily: 'Courier New, monospace', textShadow: '0 0 10px rgba(52, 211, 153, 0.2)' }}>
                        VERIFIED
                    </h2>
                    
                    {/* Bottom Metadata */}
                    <div className="w-full border-t-2 border-emerald-500/40 mt-1 pt-1 flex justify-between items-center px-2">
                         <span className="text-[8px] md:text-[10px] text-emerald-800 font-bold font-mono uppercase">{new Date(report.verifiedAt || Date.now()).toLocaleDateString()}</span>
                         <span className="text-[8px] md:text-[10px] text-emerald-800 font-black uppercase tracking-widest">Infosec Department</span>
                    </div>
                </div>
            </div>
        )}

        {/* HEADER */}
        <header className={`brand-gradient p-6 md:p-12 text-white relative overflow-hidden transition-colors duration-500 ${isVerified ? 'bg-gradient-to-r from-emerald-950 to-indira-navy' : ''}`}>
            {isVerified && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>}
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="flex gap-4 md:gap-8 items-center">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-white rounded-xl flex items-center justify-center shadow-2xl shrink-0">
                        <span className="logo-symbol text-3xl md:text-5xl">I</span>
                    </div>
                    <div>
                        <h1 className="uni-font text-2xl md:text-5xl font-black tracking-tighter text-white">
                            {isVerified ? 'Official Audit Report' : 'Security Report'}
                        </h1>
                        <p className="text-indira-gold/90 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                            Indira University <span className="w-1 h-1 bg-white/20 rounded-full"></span> {displayTier} Level
                        </p>
                    </div>
                </div>
                <div className="bg-black/20 backdrop-blur-md px-4 md:px-6 py-2 md:py-3 rounded-xl border border-white/10 w-full md:w-auto text-center md:text-right">
                    <p className="text-[8px] text-indira-gold uppercase tracking-[0.2em] font-black">Scan Reference</p>
                    <p className="font-mono text-sm md:text-lg font-black tracking-widest text-white truncate">{report.scanRequestId.slice(-8).toUpperCase()}</p>
                </div>
            </div>
        </header>

        {/* METADATA STRIP */}
        <div className="bg-indira-subtle/80 border-b border-indira-border px-6 md:px-12 py-4 md:py-6 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <div className="col-span-1">
                <span className="text-indira-gray font-black uppercase tracking-widest block mb-1 text-[8px]">Generated On</span>
                <span className="text-indira-navy font-bold text-[10px] md:text-sm">{new Date(report.created_at).toLocaleDateString()}</span>
            </div>
            <div className="col-span-1">
                <span className="text-indira-gray font-black uppercase tracking-widest block mb-1 text-[8px]">Engine Type</span>
                <span className="text-indira-navy font-bold text-[10px] md:text-sm uppercase">{report.agentType.split('_')[0]}</span>
            </div>
            <div className="col-span-2">
                <span className="text-indira-gray font-black uppercase tracking-widest block mb-1 text-[8px]">Asset Target</span>
                <span className="text-indira-navy font-mono font-bold text-[10px] md:text-sm truncate block">{report.target || "N/A"}</span>
            </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 md:p-12 space-y-12">
            
            {/* LEVEL 1: EXECUTIVE SUMMARY (Always Visible) */}
            <section className="space-y-6 md:space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                    <div className="lg:col-span-2 space-y-4 md:space-y-6">
                         {/* Status Label */}
                        <div className={`p-6 rounded-xl border-l-4 ${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.color} flex items-start gap-4`}>
                             <div className={`w-3 h-3 rounded-full mt-2 shrink-0 ${statusConfig.iconColor} animate-pulse`}></div>
                             <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight mb-2">
                                    STATUS: {statusConfig.label}
                                </h3>
                                <p className="text-sm font-bold opacity-90 leading-relaxed">
                                    {statusConfig.desc}
                                </p>
                             </div>
                        </div>
                        
                        <div className="bg-white p-6 md:p-8 rounded-2xl border-2 border-slate-100 shadow-sm relative group overflow-hidden">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Executive Summary</h3>
                            <p className="text-sm md:text-base text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{report.summary}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 text-center shadow-sm h-fit flex flex-col items-center justify-center">
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-4">Security Score</p>
                        <div className={`text-6xl md:text-8xl font-black mb-2 ${statusConfig.color}`}>{report.healthScore ?? '--'}</div>
                        <p className="text-[9px] text-slate-400 font-bold">OUT OF 100</p>
                    </div>
                </div>
            </section>

            {/* LEVEL 2 & 3: TECHNICAL FINDINGS (GATED) */}
            <section className="relative pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <h2 className="text-lg md:text-xl font-black text-indira-navy uppercase tracking-tight">Technical Audit Ledger</h2>
                    {canSeeTechnical && (
                        <div className="flex gap-2 animate-in fade-in zoom-in">
                             {isVerified ? (
                                <span className="bg-emerald-600 text-white px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest shadow-md flex items-center gap-2">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    Fully Verified
                                </span>
                             ) : (
                                <span className="bg-indira-navy text-indira-gold px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest">
                                    Advanced Access
                                </span>
                             )}
                        </div>
                    )}
                </div>

                {!canSeeTechnical ? (
                    <div className="relative py-24 px-8 bg-slate-50 border border-slate-200 rounded-3xl text-center overflow-hidden">
                        {/* Blur Filter overlay simulating hidden content */}
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-10 flex flex-col items-center justify-center p-8">
                            <div className="w-16 h-16 bg-indira-navy rounded-full flex items-center justify-center text-indira-gold text-2xl mb-6 shadow-xl">
                                🔒
                            </div>
                            <h3 className="text-xl font-black text-indira-navy uppercase mb-2">Restricted Intelligence</h3>
                            <p className="text-sm text-slate-600 font-medium max-w-md mb-8">
                                Detailed vulnerabilities and technical remediation steps are restricted. 
                                <br/>Unlock advanced access to view technical findings instantly.
                            </p>
                            
                            <button 
                                onClick={handleRequestAdvanced}
                                disabled={requestingAccess}
                                className="px-8 py-4 bg-indira-navy text-white font-black uppercase tracking-[0.2em] text-xs rounded-xl hover:bg-indira-brand transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center gap-3"
                            >
                                {requestingAccess ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Authorizing...
                                    </>
                                ) : (
                                    'Unlock Advanced Details'
                                )}
                            </button>
                        </div>
                        
                        {/* Fake Content underneath to look like blurred text */}
                        <div className="space-y-6 opacity-30 filter blur-sm select-none pointer-events-none">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white p-6 rounded-xl border border-slate-200">
                                    <div className="h-4 w-3/4 bg-slate-300 rounded mb-4"></div>
                                    <div className="h-2 w-full bg-slate-200 rounded mb-2"></div>
                                    <div className="h-2 w-5/6 bg-slate-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4">
                         {/* Full Technical Findings */}
                        {report.findings.map((finding, idx) => (
                            <div key={idx} className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden hover:border-indira-brand/30 transition-all shadow-sm">
                                <div className="bg-slate-50 p-4 md:p-6 flex flex-col sm:flex-row justify-between gap-3 border-b border-slate-100">
                                    <h3 className="font-black text-indira-navy text-sm md:text-base uppercase tracking-tight">{finding.title}</h3>
                                    <span className={`text-[8px] md:text-[9px] font-black uppercase px-3 py-1 rounded-full border-2 w-fit ${
                                        finding.severity === Severity.CRITICAL ? 'text-red-600 bg-red-50 border-red-200' : 
                                        finding.severity === Severity.HIGH ? 'text-orange-600 bg-orange-50 border-orange-200' :
                                        finding.severity === Severity.MEDIUM ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                        'text-blue-600 bg-blue-50 border-blue-200'
                                    }`}>
                                        {finding.severity}
                                    </span>
                                </div>
                                <div className="p-4 md:p-8">
                                    <p className="text-[11px] md:text-sm text-slate-700 leading-relaxed font-semibold mb-4">{finding.description}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 p-4 md:p-6 rounded-2xl border border-emerald-100">
                                            <h4 className="text-[8px] md:text-[9px] font-black uppercase text-emerald-800 tracking-[0.2em] mb-2">Remediation Protocol</h4>
                                            <p className="text-[10px] md:text-xs text-emerald-950 font-bold leading-relaxed">{finding.remediation}</p>
                                        </div>
                                        {finding.cvss_vector && (
                                            <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100">
                                                <h4 className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">CVSS v3.1 Metrics</h4>
                                                <p className="text-[10px] md:text-xs font-mono text-slate-700 font-bold break-all">{finding.cvss_vector}</p>
                                                <p className="text-2xl font-black text-indira-navy mt-2">{finding.cvss_score}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                         {/* VERIFICATION / AUDIT FOOTER */}
                        {isVerified ? (
                            <div className="mt-16 pt-12 border-t-4 border-double border-slate-200 print-break-inside-avoid">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
                                    
                                    {/* Left: Officer Signature */}
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Security Officer Authorization</p>
                                        <div className="flex items-center gap-6">
                                            <div className="relative">
                                                <div className="w-20 h-20 border-2 border-indira-navy rounded-full flex items-center justify-center opacity-20"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="font-serif text-4xl text-indira-navy/40 font-bold italic">Signed</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-indira-navy uppercase tracking-tight mb-1">{report.verifiedBy || 'Infosec Officer'}</p>
                                                <p className="text-[10px] text-indira-brand font-black uppercase tracking-widest">Indira University Infosec Team</p>
                                                <div className="h-0.5 w-32 bg-indira-navy mt-2"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Timestamp & Hash */}
                                    <div className="flex-1 md:text-right">
                                        <div className="inline-block text-left md:text-right">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Cryptographic Timestamp</p>
                                            <p className="text-sm font-mono font-bold text-indira-navy mb-6 border-b border-slate-200 pb-2">
                                                {report.verifiedAt ? new Date(report.verifiedAt).toLocaleDateString() : 'N/A'} &mdash; {report.verifiedAt ? new Date(report.verifiedAt).toLocaleTimeString() : 'N/A'}
                                            </p>
                                            
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Audit Reference Hash</p>
                                            <p className="font-mono text-[10px] text-slate-500 bg-slate-50 px-3 py-2 rounded border border-slate-100">
                                                {report.id}-{report.scanRequestId?.substring(0,8)}-VERIFIED
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Disclaimer */}
                                <div className="mt-12 text-center">
                                    <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">
                                        This document is an official security audit record of Indira University. 
                                        <br/>Approved for release by the Information Security Department.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* DUAL ACTION FOOTER: Certification & Support */
                            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-200 pt-12">
                                
                                {/* LEFT: OFFICIAL CERTIFICATION */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm mb-4 border border-slate-100">🎖️</div>
                                    <h4 className="text-sm font-black text-indira-navy uppercase tracking-tight mb-2">Official Certification</h4>
                                    <p className="text-[10px] md:text-xs text-slate-500 mb-6 leading-relaxed max-w-sm">
                                        Need this report for compliance, grants, or external audits? Request a formal review to receive a signed verification seal.
                                    </p>
                                    
                                    {verificationStatus === 'pending_approval' ? (
                                        <div className="bg-amber-100 text-amber-800 px-6 py-3 rounded-lg font-black uppercase text-[9px] tracking-widest border border-amber-200 flex items-center gap-2 w-full justify-center">
                                            <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                                            Review Pending
                                        </div>
                                    ) : verificationStatus === 'rejected' ? (
                                        <div className="bg-red-50 text-red-700 px-6 py-4 rounded-xl font-black uppercase text-[9px] tracking-widest border border-red-200 w-full text-center">
                                             Verification Denied
                                             {alert?.rejectionReason && (
                                                <span className="block mt-1 font-medium normal-case italic opacity-80">
                                                    "{alert.rejectionReason}"
                                                </span>
                                             )}
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleRequestVerify}
                                            disabled={requestingVerification}
                                            className="w-full bg-indira-navy text-white px-6 py-3 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] hover:bg-indira-brand shadow-lg transition-all active:scale-95 disabled:opacity-70"
                                        >
                                            {requestingVerification ? 'Submitting...' : 'Request Seal'}
                                        </button>
                                    )}
                                </div>

                                {/* RIGHT: QUERY & SUPPORT CENTER */}
                                <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center shadow-sm hover:border-indira-brand/30 transition-all relative overflow-hidden">
                                     <div className="absolute top-0 left-0 w-full h-1 bg-indira-gold"></div>
                                     <div className="w-12 h-12 bg-indira-subtle rounded-full flex items-center justify-center text-2xl shadow-sm mb-4 text-indira-brand">💬</div>
                                     <h4 className="text-sm font-black text-indira-navy uppercase tracking-tight mb-2">InfoSec Support Center</h4>
                                     
                                     {!showQueryForm && !querySent ? (
                                         <>
                                            <p className="text-[10px] md:text-xs text-slate-500 mb-6 leading-relaxed max-w-sm">
                                                Have questions about specific findings? Contact the Cyber Defense team directly for clarification or assistance.
                                            </p>
                                            <button 
                                                onClick={() => setShowQueryForm(true)}
                                                className="w-full bg-white border-2 border-indira-border text-indira-navy px-6 py-3 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] hover:bg-indira-subtle hover:border-indira-navy transition-all active:scale-95"
                                            >
                                                Open Support Ticket
                                            </button>
                                            <div className="mt-4 pt-4 border-t border-slate-100 w-full">
                                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Direct Contact</p>
                                                <p className="text-[10px] font-bold text-indira-navy">Dr. Aditi Rao (CISO) &bull; ext. 4040</p>
                                                <p className="text-[10px] font-mono text-slate-500">infosec@indira.edu</p>
                                            </div>
                                         </>
                                     ) : querySent ? (
                                         <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in">
                                             <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                             </div>
                                             <h5 className="text-xs font-black uppercase text-emerald-700 mb-1">Ticket Submitted</h5>
                                             <p className="text-[10px] text-slate-500">The InfoSec team will review your query shortly.</p>
                                             <button onClick={() => setQuerySent(false)} className="mt-4 text-[9px] font-bold underline text-slate-400 hover:text-indira-navy">Send another query</button>
                                         </div>
                                     ) : (
                                         <div className="w-full text-left animate-in fade-in slide-in-from-bottom-2">
                                             <label className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">Describe your issue</label>
                                             <textarea 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-700 outline-none focus:border-indira-brand focus:ring-1 focus:ring-indira-brand mb-3 resize-none"
                                                rows={3}
                                                placeholder="e.g. I believe finding #3 is a false positive because..."
                                                value={queryText}
                                                onChange={(e) => setQueryText(e.target.value)}
                                                autoFocus
                                             />
                                             <div className="flex gap-2">
                                                 <button 
                                                    onClick={() => setShowQueryForm(false)}
                                                    className="flex-1 py-2 text-[9px] font-black uppercase text-slate-400 hover:text-slate-600"
                                                 >
                                                     Cancel
                                                 </button>
                                                 <button 
                                                    onClick={handleSubmitQuery}
                                                    disabled={submittingQuery}
                                                    className="flex-1 bg-indira-brand text-white py-2 rounded-lg font-black uppercase text-[9px] tracking-wide hover:bg-indira-navy shadow-md disabled:opacity-70"
                                                 >
                                                     {submittingQuery ? 'Sending...' : 'Submit Ticket'}
                                                 </button>
                                             </div>
                                         </div>
                                     )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
      </div>
    </div>
  );
};

export default ReportView;

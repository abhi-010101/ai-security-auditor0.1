
import React, { useState, useRef, useEffect } from 'react';
import { AgentType, UserRole } from '../types';
import { db } from '../services/firebase';

interface ScannerProps {
  userRole: UserRole;
  onScanInitiated: (scanId: string) => void;
}

const TerminalLoader = () => {
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const logs = [
      "CRACKING_RSA_KEY_2048...",
      "> BYPASSING_FIREWALL_AUTH...",
      "> INJECTING_REMOTE_PROBE...",
      "> DUMPING_MEMORY_BUFFER_0xF02A...",
      "> ESCALATING_PRIVILEGES...",
      "> ESTABLISHING_ENCRYPTED_CHANNEL...",
      "> ANALYZING_BINARY_HEURISTICS...",
      "> MAPPING_NETWORK_TOPOLOGY...",
      "> ISOLATING_THREAT_SIGNATURES...",
      "> SCRAPING_METADATA_ENDPOINT...",
      "> AGENT_PAYLOAD_DEPLOYED.",
      "> TRANSMITTING_TELEMETRY...",
      "> FINALIZING_ORCHESTRATION..."
    ];
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < logs.length) {
        setLines(prev => [...prev, logs[currentIndex]]);
        currentIndex++;
      } else {
        currentIndex = 0;
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-40 md:h-44 bg-[#020617] border-t border-emerald-500/40 z-50 flex overflow-hidden animate-in slide-in-from-bottom duration-300">
       <div className="w-24 md:w-48 border-r border-emerald-500/20 p-2 md:p-4 flex flex-col justify-between shrink-0 bg-[#050b1a]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[7px] md:text-[10px] font-black text-emerald-500 tracking-widest uppercase">Agent Activity</span>
            </div>
            <div className="text-[7px] md:text-[9px] font-mono text-emerald-700 leading-tight truncate">
              ID: {Math.random().toString(16).slice(2, 6).toUpperCase()}<br/>
              PORT: 8080<br/>
              STATUS: ACTIVE
            </div>
          </div>
          <div className="text-[7px] md:text-[9px] font-mono text-emerald-900">
             &copy; INDIRA_OS
          </div>
       </div>

       <div ref={scrollRef} className="flex-1 p-3 md:p-4 font-mono text-[8px] md:text-xs overflow-y-auto custom-scrollbar-hidden bg-[#0a0f1e]/50">
          <div className="space-y-1">
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 md:gap-3 text-emerald-400/80">
                <span className="text-emerald-900 shrink-0 hidden md:inline">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="break-all">{line}</span>
              </div>
            ))}
            <div className="flex gap-3 text-emerald-500 font-bold">
               <span className="animate-pulse">_ EXECUTION_IN_PROGRESS...</span>
            </div>
          </div>
       </div>

       <div className="w-20 md:w-40 border-l border-emerald-500/20 p-2 md:p-4 hidden sm:flex flex-col justify-center items-center gap-4 bg-[#050b1a]">
          <div className="relative w-10 h-10 md:w-16 md:h-16 border border-emerald-500/30 rounded-full flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
             <div className="w-full h-0.5 bg-emerald-500/50 absolute animate-[scan_2s_linear_infinite]"></div>
             <span className="text-[7px] md:text-[10px] font-mono text-emerald-500 font-bold z-10">SCAN</span>
          </div>
       </div>

       <style>{`
          @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
          .custom-scrollbar-hidden::-webkit-scrollbar { display: none; }
       `}</style>
    </div>
  );
};

const Scanner: React.FC<ScannerProps> = ({ userRole, onScanInitiated }) => {
  const [activeAgent, setActiveAgent] = useState<AgentType>(AgentType.WEB_SCANNER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string, data: string, mimeType: string } | null>(null);

  const agentConfig = {
      [AgentType.WEB_SCANNER]: { 
          name: "Web Repository Scanner", 
          desc: "Vulnerability analysis for URLs and Repositories", 
          type: "text",
          requirements: "Target URL (e.g., https://api.indira.edu) or Repository Link.",
          placeholder: "Paste the URL of the service or the public GitHub/GitLab link to scan for OWASP vulnerabilities..."
      },
      [AgentType.CODE_ANALYST]: { 
          name: "Code Security Analyst", 
          desc: "Source code patterns and SAST checks", 
          type: "text",
          requirements: "Snippet of Source Code (JS, Python, Java, etc.) or Cloud Config (YAML, JSON).",
          placeholder: "Paste the code snippet, Dockerfile, or server configuration file content you want the analyst to audit..."
      },
      [AgentType.LOG_ANALYSIS]: { 
          name: "SOC Log Analyst", 
          desc: "System and Network Event Correlation", 
          type: "file",
          requirements: "SIEM Logs, CSV/JSON Firewall exports, or HTTP access logs.",
          placeholder: "Upload a log file containing event telemetry for threat correlation...",
          accept: ".log,.txt,.csv,.json,.gz,.zip",
          fileTypes: "LOG, TXT, CSV, JSON, GZ, ZIP"
      },
      [AgentType.MALWARE_ANALYSIS]: { 
          name: "Malware Detection", 
          desc: "Binary forensics and suspicious script analysis", 
          type: "file",
          requirements: "Suspicious Binaries, Shell Scripts (.sh, .ps1), or suspicious PDFs.",
          placeholder: "Upload a suspicious file or script to run through the isolated sandbox environment...",
          accept: ".exe,.dll,.sh,.ps1,.pdf,.zip,.bin,.gz",
          fileTypes: "EXE, DLL, SH, PS1, PDF, ZIP, BIN, GZ"
      },
      [AgentType.COMPLIANCE]: { 
          name: "Compliance Checker", 
          desc: "University policy and ISO/CIS benchmark audit", 
          type: "text",
          requirements: "Infrastructure Description or System Policy documents.",
          placeholder: "Describe your infrastructure stack or paste the contents of a security policy to check for compliance gaps..."
      },
  };

  // RESTRICT AGENTS FOR USERS
  let agentOrder: AgentType[] = [];
  if (userRole === UserRole.USER) {
      // Users see: Web, Code, Malware
      agentOrder = [AgentType.WEB_SCANNER, AgentType.CODE_ANALYST, AgentType.MALWARE_ANALYSIS];
  } else {
      // Infosec/Admin see all
      agentOrder = [AgentType.WEB_SCANNER, AgentType.CODE_ANALYST, AgentType.LOG_ANALYSIS, AgentType.MALWARE_ANALYSIS, AgentType.COMPLIANCE];
  }

  // Effect to reset active agent if current one isn't in allowlist
  useEffect(() => {
      if (!agentOrder.includes(activeAgent)) {
          setActiveAgent(agentOrder[0]);
      }
  }, [userRole]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1000000) {
       alert("Security Override: File exceeds the 1MB safety threshold.");
       return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const matches = result.match(/^data:(.+);base64,(.+)$/);
      if (matches) setSelectedFile({ name: file.name, mimeType: matches[1], data: matches[2] });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!input && !selectedFile) {
        alert("Action Required: Please provide the necessary input data for the agent.");
        return;
    }
    setIsSubmitting(true);
    try {
        const payload: any = { target: input || selectedFile?.name || "Target Artifact", agentType: activeAgent };
        if (selectedFile) payload.fileMetadata = selectedFile;
        const newReqId = await db.createScanRequest(payload);
        await new Promise(resolve => setTimeout(resolve, 3000));
        onScanInitiated(newReqId);
        setInput("");
        setSelectedFile(null);
    } catch (e: any) {
        alert(`Analysis Failed: ${e.message}`);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="bg-white p-4 md:p-8 lg:p-12 pb-20 rounded-xl shadow-xl border-t-8 border-indira-brand max-w-6xl mx-auto relative overflow-hidden animate-in fade-in duration-500 min-h-[500px]">
        {isSubmitting && <TerminalLoader />}
        
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 relative z-10">
            {/* AGENT SELECTION */}
            <div className="w-full lg:w-1/3 space-y-2 border-b lg:border-b-0 lg:border-r border-indira-border pb-6 lg:pb-0 lg:pr-8">
                <h3 className="text-[10px] font-black text-indira-gray uppercase tracking-[0.4em] mb-4 lg:mb-6">Select Engine</h3>
                <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                    {agentOrder.map((agent) => (
                        <button
                            key={agent}
                            onClick={() => { setActiveAgent(agent); setInput(""); setSelectedFile(null); }}
                            className={`whitespace-nowrap lg:whitespace-normal flex-shrink-0 lg:w-full text-left p-3 lg:p-4 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                                activeAgent === agent 
                                ? 'bg-indira-navy text-indira-gold border-indira-navy shadow-xl shadow-indira-navy/20' 
                                : 'bg-white text-indira-gray border-slate-100 hover:border-indira-brand hover:text-indira-brand'
                            }`}
                        >
                            {agentConfig[agent].name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full lg:w-2/3 flex flex-col gap-6">
                <div className="text-center lg:text-left">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-indira-navy mb-2 uni-font uppercase tracking-tight leading-tight">{agentConfig[activeAgent].name}</h2>
                    <p className="text-indira-gray text-[10px] lg:text-xs font-bold uppercase tracking-widest">{agentConfig[activeAgent].desc}</p>
                </div>

                <div className={`bg-indira-subtle/50 p-4 md:p-8 lg:p-10 rounded-2xl border transition-all duration-300 min-h-[300px] lg:min-h-[350px] flex flex-col ${isSubmitting ? 'opacity-40 pointer-events-none' : 'border-indira-border shadow-inner'}`}>
                    {/* REQUIREMENT NOTIFICATION */}
                    <div className="mb-6 bg-white border-l-4 border-indira-gold p-4 rounded-r-xl shadow-sm">
                        <h4 className="text-[8px] md:text-[9px] font-black uppercase text-indira-gold tracking-[0.2em] mb-1">Intelligence Context Required</h4>
                        <p className="text-[10px] md:text-xs font-bold text-indira-navy">
                            {agentConfig[activeAgent].requirements}
                        </p>
                    </div>

                    {agentConfig[activeAgent].type === 'file' ? (
                        <div className="flex-1 flex flex-col">
                            <div 
                                onClick={() => !isSubmitting && fileInputRef.current?.click()}
                                className="flex-1 border-2 border-dashed border-indira-gray/30 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-indira-brand hover:bg-white transition-all group bg-white/40 min-h-[200px]"
                            >
                                <span className="text-4xl lg:text-5xl text-indira-gray/50 mb-4 group-hover:scale-110 group-hover:text-indira-brand transition-all">
                                    {selectedFile ? '📄' : '📂'}
                                </span>
                                <span className="text-[10px] lg:text-sm font-black text-indira-navy uppercase tracking-[0.2em] px-4 text-center">
                                    {selectedFile ? selectedFile.name : "Upload Secure Artifact"}
                                </span>
                                <div className="mt-4 flex flex-col items-center gap-1">
                                    <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-widest">Limit: 1MB</p>
                                    <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-widest">Formats: {agentConfig[activeAgent].fileTypes}</p>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileChange} 
                                    accept={agentConfig[activeAgent].accept}
                                />
                            </div>
                        </div>
                    ) : (
                        <textarea 
                            className="flex-1 w-full bg-white border-2 border-indira-border p-4 md:p-6 text-xs lg:text-sm font-mono text-indira-dark outline-none focus:border-indira-brand transition-all rounded-3xl shadow-sm min-h-[200px]"
                            placeholder={agentConfig[activeAgent].placeholder}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                    )}

                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <span className="text-[9px] font-black text-indira-gray flex items-center gap-2 uppercase tracking-widest text-center sm:text-left">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                            Ready for Analysis
                        </span>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`w-full sm:w-auto px-8 lg:px-12 py-3 lg:py-4 rounded-xl font-black uppercase text-[10px] lg:text-xs tracking-[0.3em] shadow-xl transition-all ${
                                isSubmitting 
                                ? 'bg-indira-navy text-indira-gold animate-pulse' 
                                : 'bg-indira-gold text-indira-navy hover:bg-indira-navy hover:text-white'
                            }`}
                        >
                            {isSubmitting ? 'Deploying...' : 'Engage Agent'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Scanner;

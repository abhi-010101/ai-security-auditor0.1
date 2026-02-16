
import React, { useState, useRef, useEffect } from 'react';
import { AgentType } from '../types';
import { db } from '../services/firebase';

interface ScannerProps {
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
    <div className="absolute bottom-0 left-0 right-0 h-44 bg-[#020617] border-t border-emerald-500/40 z-50 flex overflow-hidden animate-in slide-in-from-bottom duration-300">
       <div className="w-48 border-r border-emerald-500/20 p-4 flex flex-col justify-between shrink-0 bg-[#050b1a]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-500 tracking-widest uppercase">Agent Activity</span>
            </div>
            <div className="text-[9px] font-mono text-emerald-700 leading-tight">
              SESSION: {Math.random().toString(16).slice(2, 8).toUpperCase()}<br/>
              PORT: 8080<br/>
              STATUS: ACTIVE
            </div>
          </div>
          <div className="text-[9px] font-mono text-emerald-900">
             &copy; INDIRA_UNIGUARD_OS
          </div>
       </div>

       <div ref={scrollRef} className="flex-1 p-4 font-mono text-[10px] md:text-xs overflow-y-auto custom-scrollbar-hidden bg-[#0a0f1e]/50">
          <div className="space-y-1">
            {lines.map((line, i) => (
              <div key={i} className="flex gap-3 text-emerald-400/80">
                <span className="text-emerald-900 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="break-all">{line}</span>
              </div>
            ))}
            <div className="flex gap-3 text-emerald-500 font-bold">
               <span className="text-emerald-900 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
               <span className="animate-pulse">_ EXECUTION_IN_PROGRESS...</span>
            </div>
          </div>
       </div>

       <div className="w-40 border-l border-emerald-500/20 p-4 hidden md:flex flex-col justify-center items-center gap-4 bg-[#050b1a]">
          <div className="relative w-16 h-16 border border-emerald-500/30 rounded-full flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
             <div className="w-full h-0.5 bg-emerald-500/50 absolute animate-[scan_2s_linear_infinite]"></div>
             <span className="text-[10px] font-mono text-emerald-500 font-bold z-10">SCAN</span>
          </div>
          <div className="w-full h-1 bg-emerald-900 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500 w-1/2 animate-[progress_3s_ease-in-out_infinite]"></div>
          </div>
       </div>

       <style>{`
          @keyframes scan {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
          }
          @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          .custom-scrollbar-hidden::-webkit-scrollbar { display: none; }
       `}</style>
    </div>
  );
};

const Scanner: React.FC<ScannerProps> = ({ onScanInitiated }) => {
  const [activeAgent, setActiveAgent] = useState<AgentType>(AgentType.WEB_SCANNER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string, data: string, mimeType: string } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // FIRESTORE HARD LIMIT CHECK: 1MB (1,048,576 bytes)
    // We leave a buffer (1,000,000 bytes) for metadata.
    if (file.size > 1000000) {
       alert("File exceeds the 1MB limit for Cloud Firestore documents. Please compress the file or use a smaller sample.");
       if (fileInputRef.current) fileInputRef.current.value = '';
       return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      // Robust Data URL parsing
      const matches = result.match(/^data:(.+);base64,(.+)$/);
      
      if (matches) {
          setSelectedFile({
            name: file.name,
            mimeType: matches[1],
            data: matches[2]
          });
      } else {
          // Fallback if regex fails - try to infer mime or use octet-stream
          let fallbackMime = file.type || 'application/octet-stream';
          // Ensure base64 string
          const base64Data = result.includes(',') ? result.split(',')[1] : result;
          
          setSelectedFile({
            name: file.name,
            mimeType: fallbackMime,
            data: base64Data
          });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!input && !selectedFile) {
        alert("Please provide input or a file.");
        return;
    }

    setIsSubmitting(true);
    
    try {
        const start = Date.now();

        // 1. Construct the base payload (Plain Object)
        const payload: any = {
            target: input || selectedFile?.name || "Unknown Target",
            agentType: activeAgent
        };

        // 2. Explicitly construct fileMetadata using primitives to prevent Firestore errors
        if (selectedFile) {
            const safeMetadata = {
                name: selectedFile.name ? String(selectedFile.name) : "unknown_file",
                mimeType: selectedFile.mimeType ? String(selectedFile.mimeType) : "application/octet-stream",
                data: selectedFile.data ? String(selectedFile.data) : "",
                size: (selectedFile.data && selectedFile.data.length) ? Number(selectedFile.data.length) : 0
            };
            
            // Validate safeMetadata isn't empty or containing undefined
            if (!safeMetadata.data) throw new Error("File processing failed. Data is empty.");

            // Double-check sanitization via JSON parsing to ensure pure object
            payload.fileMetadata = JSON.parse(JSON.stringify(safeMetadata));
        }

        const newReqId = await db.createScanRequest(payload);

        // UI Delay for effect
        const elapsed = Date.now() - start;
        if (elapsed < 3000) {
            await new Promise(resolve => setTimeout(resolve, 3000 - elapsed));
        }

        onScanInitiated(newReqId);
        setInput("");
        setSelectedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = '';

    } catch (e: any) {
        console.error("Submission Error:", e);
        // User friendly error for size limits or firestore structure issues
        if (e.message && e.message.includes("larger than")) {
            alert(`Submission Failed: File is too large for the database. Please use a smaller file.`);
        } else if (e.message && e.message.includes("nested entity")) {
             alert(`Submission Failed: Database rejected file structure. Try renaming the file or converting it.`);
        } else {
            alert(`Submission Failed: ${e.message}`);
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const agentConfig = {
      [AgentType.WEB_SCANNER]: { name: "Web Repository Scanner", desc: "URL / Domain / CSV Data", type: "text" },
      [AgentType.CODE_ANALYST]: { name: "Code Security Analyst", desc: "Source Code / Config Files", type: "text" },
      [AgentType.LOG_ANALYSIS]: { name: "SOC Log Analyst", desc: "SIEM Logs / CSV / JSON", type: "file" },
      [AgentType.MALWARE_ANALYSIS]: { name: "Malware Detection", desc: "Binaries / Scripts / PDF / ZIP", type: "file" },
      [AgentType.COMPLIANCE]: { name: "Compliance Checker", desc: "Policy Docs / Spreadsheets", type: "text" },
  };

  return (
    <div className="bg-white p-12 pb-20 rounded-[4px] shadow-xl border-t-8 border-indira-brand max-w-5xl mx-auto relative overflow-hidden animate-in fade-in duration-500 min-h-[500px]">
        {isSubmitting && <TerminalLoader />}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indira-brand opacity-5 rounded-full -mr-32 -mt-32 pointer-events-none"></div>

        <div className="flex gap-10 relative z-10">
            <div className="w-1/3 space-y-2 border-r border-indira-border pr-8">
                <h3 className="text-xs font-bold text-indira-gray uppercase tracking-widest mb-4">Select Security Agent</h3>
                {Object.values(AgentType).map((agent) => (
                    <button
                        key={agent}
                        onClick={() => setActiveAgent(agent)}
                        className={`w-full text-left p-4 rounded text-xs font-bold uppercase tracking-wider transition-all border-l-4 ${
                            activeAgent === agent 
                            ? 'bg-indira-navy text-indira-gold border-indira-gold shadow-md' 
                            : 'bg-white text-indira-gray border-transparent hover:bg-indira-subtle hover:text-indira-brand'
                        }`}
                    >
                        {agentConfig[agent].name}
                    </button>
                ))}
            </div>

            <div className="w-2/3 flex flex-col gap-6">
                <div>
                    <h2 className="text-2xl font-black text-indira-navy mb-1 uni-font">{agentConfig[activeAgent].name}</h2>
                    <p className="text-indira-gray text-sm font-medium">{agentConfig[activeAgent].desc}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`w-2 h-2 rounded-full ${isSubmitting ? 'bg-amber-500 animate-bounce' : 'bg-emerald-500 animate-pulse'}`}></span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isSubmitting ? 'text-amber-600' : 'text-emerald-600'}`}>
                           {isSubmitting ? 'Encryption Engine Engaged' : 'Isolated Runtime Active'}
                        </span>
                    </div>
                </div>

                <div className={`bg-indira-subtle p-8 rounded border transition-all duration-300 min-h-[300px] flex flex-col ${isSubmitting ? 'opacity-40 grayscale pointer-events-none border-amber-200' : 'border-indira-border'}`}>
                    {agentConfig[activeAgent].type === 'file' ? (
                        <div 
                            onClick={() => !isSubmitting && fileInputRef.current?.click()}
                            className="flex-1 border-2 border-dashed border-indira-gray/30 rounded flex flex-col items-center justify-center cursor-pointer hover:border-indira-brand hover:bg-white transition-all group"
                        >
                            <span className="text-4xl text-indira-gray/50 mb-4 group-hover:scale-110 group-hover:text-indira-brand transition-all">
                                {selectedFile ? '📄' : '📂'}
                            </span>
                            <span className="text-sm font-bold text-indira-navy uppercase tracking-widest group-hover:text-indira-brand">
                                {selectedFile ? selectedFile.name : "Upload Artifact"}
                            </span>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 text-center max-w-xs">
                                Supports: CSV, JSON, LOG, TXT, PDF, IMG, CODE, ZIP<br/>Max Size: 1MB (Cloud Limit)
                            </p>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                        </div>
                    ) : (
                        <textarea 
                            className="flex-1 w-full bg-white border border-indira-border p-4 text-sm font-mono text-indira-dark outline-none focus:border-indira-brand focus:ring-1 focus:ring-indira-brand transition-all rounded"
                            placeholder={`Enter target context for ${agentConfig[activeAgent].name}...`}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isSubmitting}
                        />
                    )}

                    <div className="mt-6 flex justify-between items-center">
                        <span className="text-xs font-mono text-indira-gray flex items-center gap-2">
                            {isSubmitting ? (
                                <span className="flex items-center gap-2 text-indira-navy font-black italic">
                                    ESTABLISHING_COMMAND_AND_CONTROL...
                                </span>
                            ) : (
                                <span className="text-indira-gray">Ready for Analysis</span>
                            )}
                        </span>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`px-8 py-3 rounded font-black uppercase text-xs tracking-[0.2em] shadow-lg transition-all ${
                                isSubmitting 
                                ? 'bg-indira-navy text-indira-gold animate-pulse cursor-wait' 
                                : 'bg-indira-gold text-indira-navy hover:bg-white hover:text-indira-brand hover:ring-2 hover:ring-indira-brand hover:-translate-y-1'
                            }`}
                        >
                            {isSubmitting ? 'Deploying...' : 'Run Scan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Scanner;


import React, { useState, useEffect, useRef } from 'react';
import { Alert, ChatMessage, UserRole, User } from '../types';
import { db } from '../services/firebase';

interface ChatInterfaceProps {
  alert: Alert;
  currentUser: User;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ alert, currentUser }) => {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(alert.messages || []);
  const [isSending, setIsSending] = useState(false);
  const [piiWarning, setPiiWarning] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Sync messages from prop
  useEffect(() => {
    if (alert.messages) {
        setMessages(alert.messages);
    }
  }, [alert.messages]);

  const checkPII = (text: string) => {
    // Basic Regex for PII (Credit Cards, SSN-ish patterns, "Password" keywords)
    const creditCard = /\b(?:\d[ -]*?){13,16}\b/;
    const ssn = /\b\d{3}-\d{2}-\d{4}\b/;
    const password = /password\s*[:=]\s*\S+/i;
    
    if (creditCard.test(text)) return "Credit card pattern detected. Do not share financial data.";
    if (ssn.test(text)) return "SSN pattern detected. Do not share PII.";
    if (password.test(text)) return "Credential detected. Never share passwords in chat.";
    
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setInputText(text);
      setPiiWarning(checkPII(text));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
          window.alert("File exceeds 10MB limit.");
          return;
      }
      
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      if (!allowedTypes.includes(file.type)) {
          window.alert("Only PDF, PNG, and JPG are allowed.");
          return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
          setAttachment({
              name: file.name,
              type: file.type,
              size: file.size,
              data: ev.target?.result as string
          });
      };
      reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !attachment) || isSending) return;
    if (piiWarning) {
        const confirm = window.confirm("Security Warning: Your message contains potential sensitive data. Send anyway?");
        if (!confirm) return;
    }
    
    setIsSending(true);
    await db.sendChatMessage(alert.id!, inputText, attachment);
    setInputText("");
    setAttachment(null);
    setPiiWarning(null);
    setIsSending(false);
  };

  const isClosed = alert.status === 'resolved' || alert.status === 'closed' || alert.status === 'rejected';

  // Ticket Header Stats
  const getSeverityColor = (sev: string) => {
      switch(sev) {
          case 'critical': return 'text-red-600 bg-red-50 border-red-200';
          case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
          case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
          default: return 'text-blue-600 bg-blue-50 border-blue-200';
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Encryption Banner */}
      <div className="bg-indira-navy text-white text-[8px] font-black uppercase tracking-[0.2em] py-1 text-center flex items-center justify-center gap-2">
          <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          End-to-End Encrypted Session • Audit Logging Active
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.length === 0 && (
              <div className="text-center py-10 opacity-50">
                  <p className="text-xs font-bold uppercase tracking-widest">Start of encrypted history</p>
              </div>
          )}

          {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.uid;
              const isSystem = msg.isSystemMessage;

              if (isSystem) {
                  return (
                      <div key={msg.id} className="flex justify-center my-2">
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-200/50 px-2 py-1 rounded">
                              {msg.text}
                          </span>
                      </div>
                  );
              }

              return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl p-3 shadow-sm ${
                          isMe ? 'bg-indira-navy text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                      }`}>
                          <div className="flex justify-between items-center gap-4 mb-1 border-b border-white/10 pb-1">
                              <span className={`text-[9px] font-black uppercase tracking-wider ${isMe ? 'text-indira-gold' : 'text-indira-navy'}`}>
                                  {msg.senderName} ({msg.senderRole})
                              </span>
                              <span className={`text-[8px] ${isMe ? 'text-slate-300' : 'text-slate-400'}`}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                          </div>
                          
                          {msg.text && <p className="text-xs md:text-sm font-medium whitespace-pre-wrap">{msg.text}</p>}
                          
                          {msg.attachment && (
                              <div className="mt-2 bg-black/10 p-2 rounded flex items-center gap-2">
                                  <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">📎</div>
                                  <div className="overflow-hidden">
                                      <p className="text-[10px] font-bold truncate max-w-[150px]">{msg.attachment.name}</p>
                                      <p className="text-[8px] opacity-70">{(msg.attachment.size / 1024).toFixed(1)} KB</p>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              );
          })}
      </div>

      {/* Status Bar if Closed */}
      {isClosed && (
          <div className="p-4 bg-slate-100 border-t border-slate-200 text-center">
              <p className="text-xs font-black uppercase text-slate-500 tracking-widest">
                  This session is closed.
              </p>
              {alert.resolutionSummary && (
                  <p className="text-xs text-slate-600 mt-1 italic">"{alert.resolutionSummary}"</p>
              )}
          </div>
      )}

      {/* Input Area */}
      {!isClosed && (
          <div className="bg-white border-t border-slate-200 p-3 md:p-4">
              {attachment && (
                  <div className="flex items-center gap-2 mb-2 bg-indira-subtle p-2 rounded-lg border border-indira-border w-fit">
                      <span className="text-xs font-bold text-indira-navy">{attachment.name}</span>
                      <button onClick={() => setAttachment(null)} className="text-red-500 hover:text-red-700">×</button>
                  </div>
              )}
              
              {piiWarning && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-[10px] font-black uppercase tracking-wide mb-2 flex items-center gap-2 animate-pulse">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      {piiWarning}
                  </div>
              )}

              <div className="flex gap-2 items-end">
                  <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-slate-400 hover:text-indira-navy hover:bg-slate-100 rounded-lg transition-all"
                      title="Upload File"
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".pdf,image/*" />
                  
                  <textarea
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-indira-brand focus:ring-1 focus:ring-indira-brand resize-none min-h-[50px] max-h-[100px]"
                      placeholder="Type secure message..."
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                          }
                      }}
                  />
                  
                  <button 
                      onClick={handleSend}
                      disabled={isSending || (!inputText.trim() && !attachment)}
                      className="p-3 bg-indira-navy text-white rounded-xl hover:bg-indira-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                      {isSending ? (
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                      )}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default ChatInterface;

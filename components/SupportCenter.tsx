
import React, { useState, useEffect } from 'react';
import { Alert, User, UserRole, TicketCategory, Severity } from '../types';
import ChatInterface from './ChatInterface';
import { db } from '../services/firebase';

interface SupportCenterProps {
  alerts: Alert[];
  currentUser: User;
  users: User[];
}

const SupportCenter: React.FC<SupportCenterProps> = ({ alerts, currentUser, users }) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Ticket State
  const [newCategory, setNewCategory] = useState<TicketCategory>(TicketCategory.OTHER);
  const [newDescription, setNewDescription] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Resolution State
  const [resolutionNote, setResolutionNote] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);

  // Filter for Support Tickets
  const supportTickets = alerts.filter(a => {
      // Support tickets OR legacy query tickets
      const isTicket = a.type === 'support_ticket' || a.type === 'query';
      if (!isTicket) return false;
      
      // InfoSec/Admin sees all
      if (currentUser.role === UserRole.INFOSEC || currentUser.role === UserRole.ADMIN) return true;
      
      // Users see their own
      return a.created_by === currentUser.uid;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const selectedTicket = supportTickets.find(t => t.id === selectedTicketId);

  // Auto-select first
  useEffect(() => {
      if (!selectedTicketId && supportTickets.length > 0) {
          setSelectedTicketId(supportTickets[0].id!);
      }
  }, [supportTickets.length]);

  const getUserName = (uid: string) => {
      const u = users.find(user => user.uid === uid);
      return u ? u.name : 'Unknown User';
  };

  const getDepartment = (uid: string) => {
      const u = users.find(user => user.uid === uid);
      return u ? u.department : 'N/A';
  }

  const handleCreateToken = async () => {
      if (!newDescription.trim() || !captchaVerified) return;
      setIsSubmitting(true);
      await db.createSupportToken({ category: newCategory, description: newDescription });
      setIsSubmitting(false);
      setIsCreating(false);
      setNewDescription("");
      setCaptchaVerified(false);
  };

  const handleStatusChange = async (status: 'active' | 'rejected' | 'resolved') => {
      if (!selectedTicket) return;
      if (status === 'resolved' && !resolutionNote) {
          alert("Please provide a resolution summary.");
          return;
      }
      setIsResolving(true);
      await db.updateTicketStatus(selectedTicket.id!, status, resolutionNote);
      setIsResolving(false);
      setResolutionNote("");
  };

  const handleRate = async (rating: number) => {
      if (!selectedTicket) return;
      await db.submitTicketRating(selectedTicket.id!, rating);
      setUserRating(rating); // Visual feedback
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'pending_approval': return <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-yellow-200 animate-pulse">Pending Approval</span>;
          case 'active': return <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-emerald-200">Chat Active</span>;
          case 'closed': 
          case 'resolved': return <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-slate-200">Closed</span>;
          case 'rejected': return <span className="bg-red-50 text-red-500 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-red-100">Rejected</span>;
          default: return null;
      }
  };

  const getRiskColor = (severity: Severity) => {
      switch(severity) {
          case Severity.CRITICAL: return 'text-red-600 bg-red-50 border-red-100';
          case Severity.HIGH: return 'text-orange-600 bg-orange-50 border-orange-100';
          case Severity.MEDIUM: return 'text-amber-600 bg-amber-50 border-amber-100';
          default: return 'text-blue-600 bg-blue-50 border-blue-100';
      }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col animate-in fade-in duration-500">
        {/* HEADER */}
        <header className="mb-6 shrink-0 flex justify-between items-end">
           <div>
               <h2 className="text-2xl md:text-3xl font-black text-indira-navy uni-font uppercase">Support & Chat Hub</h2>
               <p className="text-indira-gray text-[10px] md:text-xs mt-1 uppercase tracking-widest font-bold">
                   {currentUser.role === UserRole.INFOSEC ? 'Live User Assistance Channels' : 'My Support Conversations'}
               </p>
           </div>
           {currentUser.role === UserRole.USER && (
               <button 
                onClick={() => setIsCreating(true)}
                className="bg-indira-gold text-indira-navy px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indira-navy hover:text-white transition-all shadow-lg"
               >
                   Raise Token
               </button>
           )}
       </header>

       {/* CREATE MODAL */}
       {isCreating && (
           <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl animate-in zoom-in-95">
                   <h3 className="text-xl font-black text-indira-navy uppercase mb-1">New Security Ticket</h3>
                   <p className="text-xs text-slate-500 font-medium mb-6">Generate a secure token to chat with InfoSec.</p>
                   
                   <div className="space-y-4">
                       <div>
                           <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Issue Category</label>
                           <select 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indira-navy outline-none focus:border-indira-brand"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                           >
                               {Object.values(TicketCategory).map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                       </div>
                       
                       <div>
                           <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Short Description (Max 500)</label>
                           <textarea 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indira-brand resize-none h-32"
                                placeholder="Describe the security anomaly..."
                                maxLength={500}
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                           />
                           <p className="text-right text-[9px] text-slate-400 mt-1">{newDescription.length}/500</p>
                       </div>

                       <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-3">
                           <input 
                                type="checkbox" 
                                id="captcha" 
                                className="w-5 h-5 rounded border-slate-300 text-indira-brand focus:ring-indira-brand"
                                checked={captchaVerified}
                                onChange={(e) => setCaptchaVerified(e.target.checked)}
                           />
                           <label htmlFor="captcha" className="text-xs font-bold text-slate-700 select-none cursor-pointer">Human Verification (I am not a bot)</label>
                       </div>

                       <div className="flex gap-3 pt-4">
                           <button onClick={() => setIsCreating(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-indira-navy">Cancel</button>
                           <button 
                                onClick={handleCreateToken}
                                disabled={!captchaVerified || !newDescription.trim() || isSubmitting}
                                className="flex-1 bg-indira-navy text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indira-brand disabled:opacity-50 transition-all shadow-lg"
                           >
                               {isSubmitting ? 'Generating Token...' : 'Generate Token'}
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       <div className="flex-1 flex gap-6 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
           {/* LEFT COLUMN: TICKET LIST */}
           <div className="w-1/3 min-w-[300px] border-r border-slate-100 flex flex-col bg-slate-50/50">
               <div className="p-4 border-b border-slate-100 bg-white">
                   <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Token Queue ({supportTickets.length})</h3>
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-2">
                   {supportTickets.length === 0 ? (
                       <div className="p-8 text-center opacity-50">
                           <p className="text-[10px] font-bold text-slate-400 uppercase">No active tokens</p>
                       </div>
                   ) : (
                       supportTickets.map(ticket => {
                           const isActive = selectedTicketId === ticket.id;
                           const senderName = getUserName(ticket.created_by);
                           const dept = getDepartment(ticket.created_by);
                           const risk = getRiskColor(ticket.severity);

                           return (
                               <button
                                   key={ticket.id}
                                   onClick={() => setSelectedTicketId(ticket.id!)}
                                   className={`w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden ${
                                       isActive 
                                       ? 'bg-white border-indira-brand shadow-md z-10' 
                                       : 'bg-white border-transparent hover:border-slate-200 hover:bg-white'
                                   }`}
                               >
                                   {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indira-brand"></div>}
                                   
                                   <div className="flex justify-between items-start mb-1.5">
                                       <span className="font-mono text-[9px] text-slate-400 font-bold">{ticket.ticketId || 'LEGACY-REQ'}</span>
                                       {getStatusBadge(ticket.status)}
                                   </div>

                                   <h4 className={`text-xs font-black uppercase mb-1 truncate ${isActive ? 'text-indira-navy' : 'text-slate-700'}`}>
                                       {ticket.ticketCategory || ticket.summary}
                                   </h4>
                                   
                                   {currentUser.role !== UserRole.USER && (
                                       <div className="flex items-center gap-2 mb-2">
                                           <div className={`w-4 h-4 rounded bg-slate-200 flex items-center justify-center text-[8px] font-black`}>{senderName.charAt(0)}</div>
                                           <span className="text-[9px] font-bold text-slate-500">{senderName} ({dept})</span>
                                       </div>
                                   )}

                                   <div className="flex items-center gap-2 mt-2">
                                       <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${risk}`}>
                                           AI Risk: {ticket.severity}
                                       </span>
                                       <span className="text-[9px] text-slate-400 ml-auto font-medium">
                                           {new Date(ticket.created_at).toLocaleDateString()}
                                       </span>
                                   </div>
                               </button>
                           );
                       })
                   )}
               </div>
           </div>

           {/* RIGHT COLUMN: WORKSPACE */}
           <div className="flex-1 flex flex-col bg-white">
               {selectedTicket ? (
                   <>
                       {/* Top Bar */}
                       <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30 shrink-0">
                           <div>
                               <div className="flex items-center gap-3">
                                   <h3 className="text-sm font-black text-indira-navy uppercase tracking-tight">
                                       {selectedTicket.ticketCategory || selectedTicket.summary}
                                   </h3>
                                   <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 rounded border border-slate-200">
                                       {selectedTicket.ticketId || 'ID-PENDING'}
                                   </span>
                               </div>
                               <p className="text-[10px] text-slate-500 mt-1 truncate max-w-lg">{selectedTicket.description}</p>
                           </div>
                           
                           <div className="flex gap-2">
                               {currentUser.role === UserRole.INFOSEC && selectedTicket.status === 'active' && (
                                   <button 
                                       onClick={() => setIsResolving(!isResolving)}
                                       className="bg-indira-navy text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indira-brand transition-all"
                                   >
                                       Resolve Issue
                                   </button>
                               )}
                               {selectedTicket.rating && selectedTicket.rating > 0 && (
                                   <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded border border-yellow-100">
                                       <span className="text-xs">⭐</span>
                                       <span className="text-[10px] font-black text-yellow-700">{selectedTicket.rating}/5</span>
                                   </div>
                               )}
                           </div>
                       </div>
                       
                       {/* RESOLUTION PANEL (INFOSEC) */}
                       {isResolving && (
                           <div className="p-4 bg-slate-100 border-b border-slate-200 animate-in slide-in-from-top-2">
                               <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Resolution Summary</label>
                               <textarea 
                                    className="w-full p-3 text-xs border border-slate-300 rounded-lg mb-3 h-20 outline-none focus:border-indira-brand"
                                    placeholder="Root cause and resolution steps..."
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                               />
                               <div className="flex gap-2 justify-end">
                                   <button onClick={() => setIsResolving(false)} className="px-4 py-2 text-[10px] font-black uppercase text-slate-500">Cancel</button>
                                   <button onClick={() => handleStatusChange('resolved')} className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700">Mark Resolved</button>
                               </div>
                           </div>
                       )}

                       {/* MAIN CONTENT AREA */}
                       <div className="flex-1 overflow-hidden relative">
                           {/* CASE 1: PENDING APPROVAL (INFOSEC VIEW) */}
                           {selectedTicket.status === 'pending_approval' && currentUser.role !== UserRole.USER ? (
                               <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                                   <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full">
                                       <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto">⚠️</div>
                                       <h3 className="text-xl font-black text-indira-navy uppercase mb-2">Token Approval Required</h3>
                                       <p className="text-sm text-slate-500 mb-6">User is requesting a secure chat channel. Review risk level before accepting.</p>
                                       
                                       <div className="grid grid-cols-2 gap-4 text-left bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                                           <div>
                                               <p className="text-[9px] font-black uppercase text-slate-400">User</p>
                                               <p className="text-xs font-bold text-indira-navy">{getUserName(selectedTicket.created_by)}</p>
                                           </div>
                                           <div>
                                                <p className="text-[9px] font-black uppercase text-slate-400">Risk</p>
                                                <p className={`text-xs font-black uppercase ${getRiskColor(selectedTicket.severity).split(' ')[0]}`}>{selectedTicket.severity}</p>
                                           </div>
                                       </div>

                                       <div className="flex gap-3">
                                           <button onClick={() => handleStatusChange('rejected')} className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-black text-[10px] uppercase hover:bg-red-50">Reject</button>
                                           <button onClick={() => handleStatusChange('active')} className="flex-1 py-3 bg-indira-navy text-white rounded-xl font-black text-[10px] uppercase hover:bg-indira-brand shadow-lg">Activate Chat</button>
                                       </div>
                                   </div>
                               </div>
                           ) : selectedTicket.status === 'pending_approval' ? (
                               /* CASE 2: PENDING APPROVAL (USER VIEW) */
                               <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center opacity-60">
                                   <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-4xl mb-4 animate-pulse">⏳</div>
                                   <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Waiting for InfoSec...</h3>
                                   <p className="text-xs text-slate-400 mt-2">Your token is in the queue. You will be notified when an agent joins.</p>
                               </div>
                           ) : (
                               /* CASE 3: ACTIVE OR CLOSED CHAT */
                               <ChatInterface alert={selectedTicket} currentUser={currentUser} />
                           )}
                       </div>

                       {/* USER RATING (IF RESOLVED) */}
                       {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && currentUser.role === UserRole.USER && !selectedTicket.rating && (
                           <div className="p-6 bg-slate-50 border-t border-slate-200 text-center animate-in slide-in-from-bottom">
                               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Rate your support experience</p>
                               <div className="flex justify-center gap-2 mb-2">
                                   {[1, 2, 3, 4, 5].map(star => (
                                       <button 
                                            key={star}
                                            onClick={() => handleRate(star)}
                                            className="text-2xl hover:scale-125 transition-transform grayscale hover:grayscale-0"
                                       >
                                           ⭐
                                       </button>
                                   ))}
                               </div>
                           </div>
                       )}
                   </>
               ) : (
                   <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                       <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-4xl mb-4 grayscale">
                           💬
                       </div>
                       <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Select a token to view details</p>
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default SupportCenter;


import React, { useState, useEffect } from 'react';
import { UserRole, User, UserStatus } from '../types';
import { db } from '../services/firebase';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.USER, department: '' });
  const [processingUids, setProcessingUids] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = db.subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
    });
    db.getCurrentUser().then(setCurrentUser);
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.addUser(newUser);
    setNewUser({ name: '', email: '', role: UserRole.USER, department: '' });
    setIsAdding(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await db.updateUser(editingUser.uid, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        department: editingUser.department
    });
    setEditingUser(null);
  };

  const handleToggleStatus = async (uid: string, current: UserStatus) => {
    try {
        setProcessingUids(prev => new Set([...prev, uid]));
        await db.updateUser(uid, { status: current === UserStatus.ACTIVE ? UserStatus.DISABLED : UserStatus.ACTIVE });
    } catch (e) {
        alert("Failed to toggle status.");
    } finally {
        setProcessingUids(prev => {
            const n = new Set(prev);
            n.delete(uid);
            return n;
        });
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!uid) return;
    if (currentUser?.uid === uid) {
        alert("CRITICAL ERROR: Admins cannot self-terminate via this console.");
        return;
    }
    
    const confirmMsg = "CRITICAL WARNING: This action will PERMANENTLY DELETE this user AND all associated security scans, reports, and logs from the database. This cannot be undone. Proceed with total data erasure?";
    
    if (window.confirm(confirmMsg)) {
        try {
            setProcessingUids(prev => new Set([...prev, uid]));
            // Optimistic update for UI feel
            setUsers(prev => prev.filter(u => u.uid !== uid));
            await db.deleteUser(uid);
        } catch (error) {
            alert("System Error: Failed to remove personnel record and associated data.");
        } finally {
            setProcessingUids(prev => {
                const n = new Set(prev);
                n.delete(uid);
                return n;
            });
        }
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') return "U";
    return name.split(' ').filter(n => n && n.length > 0).map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-xl">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-10 border-b border-slate-100 pb-6 md:pb-8 gap-4">
           <div>
               <h3 className="text-xl md:text-2xl font-black text-indira-navy uni-font uppercase tracking-tight">Identity Control</h3>
               <p className="text-[8px] md:text-[10px] font-black text-indira-gray uppercase tracking-widest mt-1">RBAC Assignment & Lifecycle Management</p>
           </div>
           <button 
                onClick={() => { setIsAdding(!isAdding); setEditingUser(null); }}
                className="w-full sm:w-auto bg-indira-navy text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indira-brand transition-all shadow-lg"
            >
             {isAdding ? 'Close Portal' : 'Add Personnel'}
           </button>
        </header>

        {(isAdding || editingUser) && (
            <div className="mb-10 p-4 md:p-8 bg-indira-subtle rounded-xl border border-indira-border animate-in slide-in-from-top duration-300">
                <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-end">
                    <div className="sm:col-span-1">
                        <label className="block text-[8px] md:text-[9px] font-black uppercase text-slate-500 mb-2">Full Name</label>
                        <input value={editingUser ? editingUser.name : newUser.name} onChange={e => editingUser ? setEditingUser({...editingUser, name: e.target.value}) : setNewUser({...newUser, name: e.target.value})} className="w-full p-3 text-xs md:text-sm font-bold border rounded-lg outline-none" required />
                    </div>
                    <div className="sm:col-span-1">
                        <label className="block text-[8px] md:text-[9px] font-black uppercase text-slate-500 mb-2">Email</label>
                        <input type="email" value={editingUser ? editingUser.email : newUser.email} onChange={e => editingUser ? setEditingUser({...editingUser, email: e.target.value}) : setNewUser({...newUser, email: e.target.value})} className="w-full p-3 text-xs md:text-sm font-bold border rounded-lg outline-none" required />
                    </div>
                    <div className="sm:col-span-1">
                        <label className="block text-[8px] md:text-[9px] font-black uppercase text-slate-500 mb-2">Dept</label>
                        <input value={editingUser ? editingUser.department : newUser.department} onChange={e => editingUser ? setEditingUser({...editingUser, department: e.target.value}) : setNewUser({...newUser, department: e.target.value})} className="w-full p-3 text-xs md:text-sm font-bold border rounded-lg outline-none" required />
                    </div>
                    <div className="sm:col-span-1 flex gap-2">
                        <select value={editingUser ? editingUser.role : newUser.role} onChange={e => editingUser ? setEditingUser({...editingUser, role: e.target.value as UserRole}) : setNewUser({...newUser, role: e.target.value as UserRole})} className="flex-1 p-3 text-xs md:text-sm font-bold border rounded-lg">
                            <option value={UserRole.USER}>USER</option>
                            <option value={UserRole.INFOSEC}>INFOSEC</option>
                            <option value={UserRole.ADMIN}>ADMIN</option>
                        </select>
                        <button type="submit" className="bg-indira-gold text-indira-navy px-4 py-3 rounded-lg font-black text-[9px] md:text-[10px] uppercase">
                            {editingUser ? 'Save' : 'Provision'}
                        </button>
                    </div>
                </form>
            </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Personnel</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Department</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">RBAC Level</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.uid} className={`hover:bg-slate-50/50 transition-colors ${processingUids.has(user.uid) ? 'opacity-40 pointer-events-none' : ''}`}>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="relative shrink-0">
                          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-black text-[10px] md:text-xs border transition-colors ${user.status === UserStatus.DISABLED ? 'bg-red-50 text-red-400 border-red-100' : 'bg-indira-navy/5 text-indira-navy border-indira-navy/10'}`}>
                            {getInitials(user.name)}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      </div>
                      <div className="min-w-0">
                        <p className={`font-black text-[11px] md:text-sm truncate ${user.status === UserStatus.DISABLED ? 'text-slate-400 line-through' : 'text-indira-navy'}`}>
                            {user.name}
                        </p>
                        <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-tight">{user.department}</td>
                  <td className="px-6 py-6">
                     <span className={`px-2 md:px-3 py-1 rounded text-[7px] md:text-[8px] font-black uppercase border-2 ${
                         user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-600 border-purple-100' :
                         user.role === UserRole.INFOSEC ? 'bg-indira-brand/5 text-indira-brand border-indira-brand/10' :
                         'bg-slate-50 text-slate-500 border-slate-100'
                     }`}>
                        {user.role}
                     </span>
                  </td>
                  <td className="px-6 py-6">
                     <span className={`px-2 md:px-3 py-1 rounded text-[7px] md:text-[8px] font-black uppercase border-2 ${
                         user.status === UserStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                     }`}>
                        {user.status}
                     </span>
                  </td>
                  <td className="px-6 py-6 text-right space-x-2 md:space-x-4">
                    <button 
                        onClick={() => handleToggleStatus(user.uid, user.status)} 
                        className={`text-[9px] font-black uppercase transition-colors ${user.status === UserStatus.ACTIVE ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                    >
                        {user.status === UserStatus.ACTIVE ? 'Suspend' : 'Activate'}
                    </button>
                    <button onClick={() => setEditingUser(user)} className="text-[9px] font-black uppercase text-indira-brand hover:underline">Edit</button>
                    <button onClick={() => handleDeleteUser(user.uid)} className="text-[9px] font-black uppercase text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <StatMini label="Total Nodes" value={users.length.toString()} />
          <StatMini label="Online Now" value={users.filter(u => u.isOnline).length.toString()} color="#10b981" />
          <StatMini label="Auditors" value={users.filter(u => u.role === UserRole.INFOSEC).length.toString()} />
      </div>
    </div>
  );
};

const StatMini = ({ label, value, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl md:text-3xl font-black text-indira-navy" style={{color}}>{value}</p>
    </div>
);

export default UserManagement;


import React, { useState, useEffect } from 'react';
import { UserRole, User, UserStatus } from '../types';
import { db } from '../services/firebase';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.USER, department: '' });
  const [deletingUids, setDeletingUids] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Subscription setup
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
    await db.updateUser(uid, { status: current === UserStatus.ACTIVE ? UserStatus.DISABLED : UserStatus.ACTIVE });
  };

  const handleDeleteUser = async (uid: string) => {
    if (!uid) return;
    
    if (currentUser?.uid === uid) {
        alert("CRITICAL ERROR: Access denied. System administrators cannot self-terminate sessions via the control console.");
        return;
    }

    if (window.confirm("CRITICAL WARNING: This action will permanently revoke all access and erase this identity from the university ledger. Proceed?")) {
        try {
            setDeletingUids(prev => new Set([...prev, uid]));
            // Optimistic local filter to show immediate feedback
            setUsers(prev => prev.filter(u => u.uid !== uid));
            
            await db.deleteUser(uid);
            console.log(`Successfully deleted user: ${uid}`);
        } catch (error) {
            console.error("Deletion Failed:", error);
            alert("System Error: Failed to remove personnel record from Firestore.");
            // Subscription will eventually put it back if delete really failed
        } finally {
            setDeletingUids(prev => {
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-xl">
        <header className="flex items-center justify-between mb-10 border-b border-slate-100 pb-8">
           <div>
               <h3 className="text-2xl font-black text-indira-navy uni-font uppercase tracking-tight">Identity Control Console</h3>
               <p className="text-[10px] font-black text-indira-gray uppercase tracking-widest mt-1">Personnel Tracking & RBAC Assignment</p>
           </div>
           <button 
                onClick={() => { setIsAdding(!isAdding); setEditingUser(null); }}
                className="bg-indira-navy text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indira-brand transition-all shadow-lg shadow-indira-navy/20"
            >
             {isAdding ? 'Close Portal' : 'Add University Personnel'}
           </button>
        </header>

        {isAdding && (
            <div className="mb-10 p-8 bg-indira-subtle rounded-xl border border-indira-border animate-in slide-in-from-top duration-300">
                <form onSubmit={handleAddUser} className="grid grid-cols-4 gap-6 items-end">
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Full Name</label>
                        <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-lg outline-none focus:border-indira-brand" required />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Email</label>
                        <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-lg outline-none focus:border-indira-brand" required />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Department</label>
                        <input value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-lg outline-none focus:border-indira-brand" required />
                    </div>
                    <div className="flex gap-4">
                        <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="flex-1 p-3 text-sm font-bold border rounded-lg">
                            <option value={UserRole.USER}>USER</option>
                            <option value={UserRole.INFOSEC}>INFOSEC</option>
                            <option value={UserRole.ADMIN}>ADMIN</option>
                        </select>
                        <button type="submit" className="bg-indira-gold text-indira-navy px-6 py-3 rounded-lg font-black text-[10px] uppercase">Provision</button>
                    </div>
                </form>
            </div>
        )}

        {editingUser && (
            <div className="mb-10 p-8 bg-indira-navy/5 rounded-xl border border-indira-brand/20 animate-in slide-in-from-top duration-300">
                <h4 className="text-[10px] font-black uppercase text-indira-brand tracking-widest mb-6">Modify Identity Profile</h4>
                <form onSubmit={handleUpdateUser} className="grid grid-cols-4 gap-6 items-end">
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Full Name</label>
                        <input value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-lg outline-none focus:border-indira-brand" required />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Email</label>
                        <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-lg outline-none focus:border-indira-brand" required />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Department</label>
                        <input value={editingUser.department || ''} onChange={e => setEditingUser({...editingUser, department: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-lg outline-none focus:border-indira-brand" required />
                    </div>
                    <div className="flex gap-4">
                        <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="flex-1 p-3 text-sm font-bold border rounded-lg">
                            <option value={UserRole.USER}>USER</option>
                            <option value={UserRole.INFOSEC}>INFOSEC</option>
                            <option value={UserRole.ADMIN}>ADMIN</option>
                        </select>
                        <button type="submit" className="bg-indira-brand text-white px-6 py-3 rounded-lg font-black text-[10px] uppercase">Update</button>
                        <button type="button" onClick={() => setEditingUser(null)} className="bg-slate-200 text-slate-600 px-6 py-3 rounded-lg font-black text-[10px] uppercase">Cancel</button>
                    </div>
                </form>
            </div>
        )}

        <div className="overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Personnel / Status</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Department</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">RBAC Level</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.uid} className={`hover:bg-slate-50/50 transition-colors ${user.uid === currentUser?.uid ? 'bg-slate-50/30' : ''} ${deletingUids.has(user.uid) ? 'opacity-40' : ''}`}>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                          <div className="w-10 h-10 rounded-lg bg-indira-navy/5 flex items-center justify-center font-black text-indira-navy text-xs border">
                            {getInitials(user.name)}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      </div>
                      <div>
                        <p className="font-black text-indira-navy text-sm flex items-center gap-2">
                            {user.name || 'Unnamed Personnel'}
                            {user.uid === currentUser?.uid && <span className="text-[8px] bg-indira-brand text-white px-2 py-0.5 rounded uppercase">Self</span>}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-xs font-bold text-slate-600 uppercase tracking-tight">{user.department}</td>
                  <td className="px-6 py-6">
                     <span className={`px-3 py-1 rounded text-[8px] font-black uppercase border-2 ${
                         user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-600 border-purple-100' :
                         user.role === UserRole.INFOSEC ? 'bg-indira-brand/5 text-indira-brand border-indira-brand/10' :
                         'bg-slate-50 text-slate-500 border-slate-100'
                     }`}>
                        {user.role}
                     </span>
                  </td>
                  <td className="px-6 py-6 text-right space-x-4">
                    <button 
                      onClick={() => { setEditingUser(user); setIsAdding(false); }}
                      className="text-[9px] font-black uppercase tracking-widest text-indira-brand hover:underline"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(user.uid, user.status)}
                      className={`text-[9px] font-black uppercase tracking-widest ${user.status === UserStatus.ACTIVE ? 'text-amber-600' : 'text-emerald-600'} hover:underline`}
                    >
                      {user.status === UserStatus.ACTIVE ? 'Suspend' : 'Restore'}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.uid)}
                      disabled={user.uid === currentUser?.uid || deletingUids.has(user.uid)}
                      className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                          user.uid === currentUser?.uid || deletingUids.has(user.uid) 
                            ? 'text-slate-300 cursor-not-allowed' 
                            : 'text-red-500 hover:bg-red-50'
                      }`}
                    >
                      {deletingUids.has(user.uid) ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
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
        <p className="text-3xl font-black text-indira-navy" style={{color}}>{value}</p>
    </div>
);

export default UserManagement;


import React, { useState, useEffect } from 'react';
import { UserRole, AgentReport, Alert, User, ReportTier } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import ReportView from './components/ReportView';
import KnowledgeBase from './components/KnowledgeBase';
import RequestCenter from './components/ApprovalQueue'; // Renamed conceptually
import UserManagement from './components/UserManagement';
import AdminReportsLog from './components/AdminReportsLog';
import LoginPage from './components/LoginPage';
import { db } from './services/firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('submit_scan'); // Default tab set to Scanner
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [selectedReport, setSelectedReport] = useState<AgentReport | null>(null);

  const [activeScanIds, setActiveScanIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Array<{id: string, message: string, type: 'success'|'info'}>>([]);

  useEffect(() => {
    if (!user) return;

    const unsubReports = db.subscribeToReports(user.role, (updatedReports) => {
      setReports(updatedReports);
      
      if (activeScanIds.length > 0) {
        const completedScans: string[] = [];
        activeScanIds.forEach(scanId => {
          const foundReport = updatedReports.find(r => r.scanRequestId === scanId);
          if (foundReport) {
            completedScans.push(scanId);
            const msg = `Scan Completed: ${foundReport.agentType.replace(/_/g, ' ')}. Basic Report Ready.`;
            addToast(msg, 'success');
          }
        });
        if (completedScans.length > 0) {
          setActiveScanIds(prev => prev.filter(id => !completedScans.includes(id)));
        }
      }
    });

    const unsubAlerts = db.subscribeToAlerts(user.role, (updatedAlerts) => {
      setAlerts(updatedAlerts);
    });

    let unsubUsers = () => {};
    // Allow INFOSEC to see users too for name resolution in logs
    if (user.role === UserRole.ADMIN || user.role === UserRole.INFOSEC) {
        unsubUsers = db.subscribeToUsers((u) => setAllUsers(u));
    }

    return () => {
      unsubReports();
      unsubAlerts();
      unsubUsers();
    };
  }, [user, activeScanIds]);

  const handleLogin = (u: User) => {
    setUser(u);
    // If Admin, default to dashboard as scanner is removed
    if (u.role === UserRole.ADMIN) {
        setActiveTab('user_dashboard');
    } else {
        setActiveTab('submit_scan');
    }
  };

  const handleLogout = async () => {
    if (user) {
      await db.updateUser(user.uid, { isOnline: false });
    }
    setUser(null);
    setSelectedReport(null);
    setAllUsers([]);
  };

  const addToast = (message: string, type: 'success' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const handleStartScan = (scanId: string) => {
    setActiveScanIds(prev => [...prev, scanId]);
    addToast("Security Agent Deployed. Check Requests.", "info");
  };

  const handleApproveRequest = async (alertId: string) => {
    if (user?.role !== UserRole.INFOSEC && user?.role !== UserRole.ADMIN) return;
    await db.approveAlert(alertId, 'approved');
    addToast("Request Authorized", "success");
  };

  const handleRejectRequest = async (alertId: string, reason?: string) => {
    if (user?.role !== UserRole.INFOSEC && user?.role !== UserRole.ADMIN) return;
    await db.approveAlert(alertId, 'rejected', reason);
    addToast("Request Denied", "info");
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const ReportOverlay = selectedReport ? (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex justify-center overflow-y-auto">
        <div className="bg-white min-h-screen w-full max-w-5xl shadow-2xl relative animate-in zoom-in-95 duration-200">
            <ReportView 
                report={selectedReport} 
                // Prioritize verification alerts to ensure rejection status is shown correctly
                alert={alerts.find(a => a.reportId === selectedReport.id && a.type === 'verification') || alerts.find(a => a.reportId === selectedReport.id)} 
                role={user.role} 
                onBack={() => setSelectedReport(null)}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
            />
        </div>
    </div>
  ) : null;

  return (
    <div className="flex min-h-screen bg-[#FFFFFF] relative overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[40] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="fixed top-20 right-4 lg:top-8 lg:right-8 z-[200] space-y-4 pointer-events-none">
        {toasts.map(toast => (
            <div key={toast.id} className="toast-enter pointer-events-auto bg-white border-l-4 border-indira-brand p-4 rounded shadow-2xl flex items-center gap-4 min-w-[280px] lg:min-w-[320px]">
                <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-indira-gold'}`}></div>
                <div>
                    <p className="text-[9px] font-black text-indira-navy uppercase tracking-widest">{toast.type === 'success' ? 'Authorized Event' : 'System Telemetry'}</p>
                    <p className="text-sm font-bold text-slate-700">{toast.message}</p>
                </div>
            </div>
        ))}
      </div>

      {ReportOverlay}
      
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
        onLogout={handleLogout} 
        isOpen={isSidebarOpen}
      />
      
      <main className="flex-1 lg:ml-72 p-4 md:p-8 lg:p-12 overflow-y-auto min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex justify-between items-center mb-6 bg-indira-navy p-4 rounded-xl text-white">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/10 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                </svg>
            </button>
            <div className="text-center">
                <h1 className="uni-font font-bold text-lg">INDIRA</h1>
            </div>
            <div className="w-10"></div>
        </div>

        <div className="mb-8 flex flex-col md:flex-row justify-between lg:justify-end items-center gap-4">
            {activeScanIds.length > 0 && (
                <div className="flex items-center gap-3 bg-white border border-indira-border px-4 py-2 rounded-lg shadow-sm w-full md:w-auto">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase text-indira-navy tracking-[0.2em]">Agent Executing...</span>
                </div>
            )}
            <div className="bg-indira-subtle px-4 py-2 rounded-lg border border-indira-border flex items-center gap-3 w-full md:w-auto">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="text-[10px] font-black text-indira-navy uppercase tracking-widest truncate">
                    Node: {user.name} ({user.role})
                 </span>
            </div>
        </div>

        <div className="animate-in fade-in duration-500">
            {/* TAB 1: DASHBOARD */}
            {activeTab === 'user_dashboard' && (
                <Dashboard 
                    role={user.role} 
                    alerts={alerts} 
                    reports={reports} 
                    users={allUsers} 
                    onViewReport={setSelectedReport} 
                />
            )}

            {/* TAB 2: SCAN ENGINES */}
            {activeTab === 'submit_scan' && (
                <div>
                    <header className="mb-10">
                        <h2 className="text-2xl lg:text-3xl font-black text-indira-navy uni-font uppercase tracking-tight">Agent Orchestration Hub</h2>
                        <p className="text-indira-gray text-[10px] lg:text-xs mt-1 uppercase tracking-widest font-bold">Deploy security researchers</p>
                    </header>
                    <Scanner userRole={user.role} onScanInitiated={handleStartScan} />
                </div>
            )}

            {/* TAB 3: REPORTS (User View) or GLOBAL LOG (Admin/Infosec View) */}
            {(activeTab === 'my_reports' || activeTab === 'reports_overview') && (
                <AdminReportsLog 
                    reports={reports} 
                    alerts={alerts} 
                    users={allUsers} 
                    currentUser={user}
                    onViewReport={setSelectedReport} 
                />
            )}

            {/* TAB 4: REQUESTS (User Track or Infosec Queue) */}
            {(activeTab === 'requests_center' || activeTab === 'approval_queue') && (
                <RequestCenter 
                    role={user.role}
                    alerts={alerts} // Passing alerts as requests
                    reports={reports}
                    onApprove={handleApproveRequest}
                    onReject={handleRejectRequest}
                />
            )}

            {activeTab === 'user_management' && user.role === UserRole.ADMIN && <UserManagement />}
            {activeTab === 'knowledge_base' && <KnowledgeBase />}
        </div>
      </main>
    </div>
  );
};

export default App;

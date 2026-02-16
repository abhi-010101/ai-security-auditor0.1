
import React, { useState, useEffect } from 'react';
import { UserRole, AgentReport, Alert, User } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import ReportView from './components/ReportView';
import KnowledgeBase from './components/KnowledgeBase';
import ApprovalQueue from './components/ApprovalQueue';
import UserManagement from './components/UserManagement';
import AdminReportsLog from './components/AdminReportsLog';
import LoginPage from './components/LoginPage';
import { db } from './services/firebase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('user_dashboard');
  
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Added for Admin Dashboard Stats
  const [selectedReport, setSelectedReport] = useState<AgentReport | null>(null);

  const [activeScanIds, setActiveScanIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Array<{id: string, message: string, type: 'success'|'info'}>>([]);

  // Setup Subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to Reports
    const unsubReports = db.subscribeToReports(user.role, (updatedReports) => {
      setReports(updatedReports);
      
      // Check for completed scans to trigger notifications
      if (activeScanIds.length > 0) {
        const completedScans: string[] = [];
        activeScanIds.forEach(scanId => {
          const foundReport = updatedReports.find(r => r.scanRequestId === scanId);
          if (foundReport) {
            completedScans.push(scanId);
            const msg = user.role === UserRole.USER 
                ? `Audit Engine Ready - Awaiting Validation` 
                : `Identity Verified: ${foundReport.agentType.replace(/_/g, ' ')}`;
            addToast(msg, 'success');
          }
        });
        if (completedScans.length > 0) {
          setActiveScanIds(prev => prev.filter(id => !completedScans.includes(id)));
        }
      }
    });

    // Subscribe to Alerts
    const unsubAlerts = db.subscribeToAlerts(user.role, (updatedAlerts) => {
      setAlerts(updatedAlerts);
    });

    // Subscribe to Users (Admin Only) for real-time dashboard stats
    let unsubUsers = () => {};
    if (user.role === UserRole.ADMIN) {
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
    setActiveTab('user_dashboard');
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
    addToast("Security Agent Deployed", "info");
    setActiveTab('user_dashboard'); 
  };

  const handleApproveAlert = async (alertId: string) => {
    if (user?.role !== UserRole.INFOSEC) return;
    await db.approveAlert(alertId, 'approved');
    addToast("Authorized & Published to User", "success");
  };

  const handleRejectAlert = async (alertId: string) => {
    if (user?.role !== UserRole.INFOSEC) return;
    await db.approveAlert(alertId, 'rejected');
    addToast("Audit Data Quarantined", "info");
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const ReportOverlay = selectedReport ? (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex justify-center overflow-y-auto">
        <div className="bg-white min-h-screen w-full max-w-5xl shadow-2xl relative animate-in zoom-in-95 duration-200">
            <ReportView 
                report={selectedReport} 
                alert={alerts.find(a => a.reportId === selectedReport.id)} 
                role={user.role} 
                onBack={() => setSelectedReport(null)}
                onApprove={handleApproveAlert}
                onReject={handleRejectAlert}
            />
        </div>
    </div>
  ) : null;

  return (
    <div className="flex min-h-screen bg-[#FFFFFF] relative">
      <div className="fixed top-8 right-8 z-[200] space-y-4 pointer-events-none">
        {toasts.map(toast => (
            <div key={toast.id} className="toast-enter pointer-events-auto bg-white border-l-4 border-indira-brand p-4 rounded shadow-2xl flex items-center gap-4 min-w-[320px]">
                <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-indira-gold'}`}></div>
                <div>
                    <p className="text-[9px] font-black text-indira-navy uppercase tracking-widest">{toast.type === 'success' ? 'Authorized Event' : 'System Telemetry'}</p>
                    <p className="text-sm font-bold text-slate-700">{toast.message}</p>
                </div>
            </div>
        ))}
      </div>

      {ReportOverlay}
      <Sidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <main className="flex-1 ml-72 p-12 overflow-y-auto">
        <div className="mb-8 flex justify-end items-center gap-6">
            {activeScanIds.length > 0 && (
                <div className="flex items-center gap-3 bg-white border border-indira-border px-4 py-2 rounded-lg shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase text-indira-navy tracking-[0.2em]">Agent Executing...</span>
                </div>
            )}
            <div className="bg-indira-subtle px-4 py-2 rounded-lg border border-indira-border flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="text-[10px] font-black text-indira-navy uppercase tracking-widest">
                    Node: {user.name} ({user.role})
                 </span>
            </div>
        </div>

        <div className="animate-in fade-in duration-500">
            {activeTab === 'user_dashboard' && (
                <Dashboard 
                    role={user.role} 
                    alerts={alerts} 
                    reports={reports} 
                    users={allUsers} 
                    onViewReport={setSelectedReport} 
                />
            )}
            {activeTab === 'submit_scan' && user.role !== UserRole.ADMIN && (
                <div>
                    <header className="mb-10">
                        <h2 className="text-3xl font-black text-indira-navy uni-font uppercase">Agent Orchestration Hub</h2>
                        <p className="text-indira-gray text-xs mt-1 uppercase tracking-widest font-bold">Deploy isolated security researchers</p>
                    </header>
                    <Scanner onScanInitiated={handleStartScan} />
                </div>
            )}
            {activeTab === 'approval_queue' && user.role === UserRole.INFOSEC && (
                <div className="space-y-12">
                    <header className="mb-10">
                        <h2 className="text-3xl font-black text-indira-navy uni-font uppercase">Approval Operations</h2>
                        <p className="text-indira-gray text-xs mt-1 uppercase tracking-widest font-bold">Validation required for ledger publication</p>
                    </header>
                    {alerts.filter(a => a.status === 'pending_approval').length === 0 ? (
                        <div className="text-center py-40 bg-white rounded-xl border-2 border-dashed border-slate-200">
                            <p className="text-indira-gray font-black uppercase tracking-widest text-xs">No Pending Items for Authorization</p>
                        </div>
                    ) : (
                        <div className="space-y-16">
                            {alerts.filter(a => a.status === 'pending_approval').map(alert => {
                                const relReport = reports.find(r => r.id === alert.reportId);
                                if (!relReport) return null;
                                return (
                                    <ApprovalQueue 
                                        key={alert.id}
                                        findings={relReport.findings}
                                        correlation={{
                                            id: alert.id,
                                            target: relReport.target || 'N/A',
                                            summary: alert.summary,
                                            reasoning: alert.description,
                                            overallRiskScore: alert.severity === 'critical' ? 98 : 74,
                                            status: 'PENDING'
                                        }}
                                        onApproveFinding={() => {}}
                                        onRejectFinding={() => {}}
                                        onApproveReport={() => handleApproveAlert(alert.id)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'reports_overview' && user.role === UserRole.ADMIN && (
                <AdminReportsLog 
                    reports={reports} 
                    alerts={alerts} 
                    users={allUsers} 
                    onViewReport={setSelectedReport} 
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

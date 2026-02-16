
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, where, limit, setDoc, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { AgentType, Severity, UserRole, User, UserStatus, Alert, AgentReport } from '../types';
import { runCentralBrainOrchestrator } from './geminiService';

const firebaseConfig = {
  apiKey: "AIzaSyCCDQykxKi2xPIY7WifDWGYlBs4fNThMus",
  authDomain: "ai-security-auditor-3e9fb.firebaseapp.com",
  databaseURL: "https://ai-security-auditor-3e9fb-default-rtdb.firebaseio.com",
  projectId: "ai-security-auditor-3e9fb",
  storageBucket: "ai-security-auditor-3e9fb.firebasestorage.app",
  messagingSenderId: "573476034121",
  appId: "1:573476034121:web:5907b35512e5e9f9b69198",
  measurementId: "G-49ZB99QNWC"
};

// Robust sanitization to prevent "Invalid nested entity" errors in Firestore
// This uses JSON serialization to guarantee a pure object structure, stripping undefineds and converting complex types.
function sanitizeData(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (value === undefined) return undefined; // Remove undefined keys
    if (typeof value === 'number' && isNaN(value)) return null; // Convert NaN to null
    return value;
  }));
}

export class FirebaseService {
  private static instance: FirebaseService;
  private firestore: any;
  private isMock: boolean = false;
  private activeUser: User | null = null;
  
  private getMockDb(): Record<string, any[]> {
    const stored = localStorage.getItem('uniguard_db');
    if (stored) return JSON.parse(stored);
    
    return {
      users: [
          { uid: 'u_1', name: 'Dr. Aditi Rao', email: 'infosec@indira.edu', password: 'password', role: UserRole.INFOSEC, status: UserStatus.ACTIVE, department: 'Cyber Defense', isOnline: false },
          { uid: 'u_2', name: 'Admin Root', email: 'admin@indira.edu', password: 'password', role: UserRole.ADMIN, status: UserStatus.ACTIVE, department: 'System Admin', isOnline: false },
          { uid: 'u_3', name: 'Research Assistant', email: 'user@indira.edu', password: 'password', role: UserRole.USER, status: UserStatus.ACTIVE, department: 'Computer Science', isOnline: false }
      ],
      scan_requests: [],
      agent_reports: [],
      alerts: [],
      logs: [],
      malware_analysis: []
    };
  }

  private saveMockDb(db: any) {
    try {
        localStorage.setItem('uniguard_db', JSON.stringify(db));
        window.dispatchEvent(new Event('storage'));
    } catch (e) {
        console.error("Local Storage Full", e);
    }
  }

  private constructor() {
    try {
        const app = initializeApp(firebaseConfig);
        this.firestore = getFirestore(app);
        this.isMock = false;
        this.seedDemoUsers(); 
    } catch (e) {
        console.warn("Firebase Init Failed, falling back to mock persistence.");
        this.isMock = true;
    }
  }

  private async seedDemoUsers() {
    if (this.isMock) return;
    const demoUsers = [
        { uid: 'u_infosec_master', name: 'Dr. Aditi Rao', email: 'infosec@indira.edu', password: 'password', role: UserRole.INFOSEC, status: UserStatus.ACTIVE, department: 'Cyber Defense' },
        { uid: 'u_admin_master', name: 'Admin Root', email: 'admin@indira.edu', password: 'password', role: UserRole.ADMIN, status: UserStatus.ACTIVE, department: 'System Admin' },
        { uid: 'u_user_master', name: 'Research Assistant', email: 'user@indira.edu', password: 'password', role: UserRole.USER, status: UserStatus.ACTIVE, department: 'Computer Science' }
    ];

    for (const u of demoUsers) {
        const userRef = doc(this.firestore, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, sanitizeData({ ...u, isOnline: false, created_at: new Date().toISOString(), created_by: 'system_seed' }));
        }
    }
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) FirebaseService.instance = new FirebaseService();
    return FirebaseService.instance;
  }

  async setActiveUser(user: User | null) {
    this.activeUser = user;
    if (user) {
        await this.updateUser(user.uid, { isOnline: true, lastActive: new Date().toISOString() });
    }
  }

  async login(email: string, pass: string): Promise<User | null> {
    if (!email) return null;
    const emailLower = email.toLowerCase().trim();
    const users = await this.getUsers();
    const found = users.find(u => 
        u.email && 
        typeof u.email === 'string' && 
        u.email.toLowerCase().trim() === emailLower && 
        (u as any).password === pass
    );

    if (found) {
        await this.setActiveUser(found);
        return found;
    }
    return null;
  }

  async register(userData: { name: string, email: string, password: string, department: string }): Promise<User> {
    const uid = `u_${Date.now()}`;
    const newUser: User = {
        uid: uid,
        name: userData.name,
        email: (userData.email || '').toLowerCase().trim(),
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        department: userData.department,
        isOnline: true,
        created_at: new Date().toISOString(),
        created_by: 'self_registration'
    };
    (newUser as any).password = userData.password;

    if (this.isMock) {
        const db = this.getMockDb();
        db.users.push(newUser);
        this.saveMockDb(db);
    } else {
        await setDoc(doc(this.firestore, 'users', uid), sanitizeData(newUser));
    }
    this.activeUser = newUser;
    return newUser;
  }

  async getCurrentUser() { return this.activeUser; }

  subscribeToUsers(callback: (users: User[]) => void) {
    if (this.isMock) {
      callback(this.getMockDb().users);
      const interval = setInterval(() => callback(this.getMockDb().users), 800);
      return () => clearInterval(interval);
    }
    return onSnapshot(collection(this.firestore, 'users'), (snap) => {
      const users = snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
      callback(users);
    });
  }

  subscribeToReports(role: UserRole, callback: (reports: AgentReport[]) => void) {
    if (this.isMock) {
      const poll = () => {
        let raw = this.getMockDb().agent_reports;
        if (role === UserRole.USER) raw = raw.filter(r => r.created_by === this.activeUser?.uid);
        callback(raw);
      };
      poll();
      const interval = setInterval(poll, 1500);
      return () => clearInterval(interval);
    }
    return onSnapshot(collection(this.firestore, 'agent_reports'), (snap) => {
      let reports = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgentReport));
      if (role === UserRole.USER) reports = reports.filter(r => r.created_by === this.activeUser?.uid);
      callback(reports.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
    });
  }

  subscribeToAlerts(role: UserRole, callback: (alerts: Alert[]) => void) {
    if (this.isMock) {
      const poll = () => {
        let raw = this.getMockDb().alerts;
        if (role === UserRole.USER) {
            const myReports = this.getMockDb().agent_reports.filter(r => r.created_by === this.activeUser?.uid).map(r => r.id);
            raw = raw.filter(a => myReports.includes(a.reportId));
        }
        callback(raw);
      };
      poll();
      const interval = setInterval(poll, 1500);
      return () => clearInterval(interval);
    }
    return onSnapshot(collection(this.firestore, 'alerts'), (snap) => {
      let alerts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      if (role === UserRole.USER) {
          const myReportsPromise = this.getReports(UserRole.USER);
          myReportsPromise.then(r => {
             const ids = r.map(x => x.id);
             callback(alerts.filter(a => ids.includes(a.reportId)));
          });
      } else {
          callback(alerts.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
      }
    });
  }

  async getUsers(): Promise<User[]> {
    if (this.isMock) return this.getMockDb().users;
    try {
        const snap = await getDocs(collection(this.firestore, 'users'));
        return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
    } catch (e) {
        return this.getMockDb().users;
    }
  }

  async getReports(role: UserRole): Promise<AgentReport[]> {
     if (this.isMock) {
       let raw = this.getMockDb().agent_reports;
       if (role === UserRole.USER) raw = raw.filter(r => r.created_by === this.activeUser?.uid);
       return raw;
     }
     const snap = await getDocs(collection(this.firestore, 'agent_reports'));
     let reports = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgentReport));
     if (role === UserRole.USER) reports = reports.filter(r => r.created_by === this.activeUser?.uid);
     return reports;
  }

  async getAlerts(role: UserRole): Promise<Alert[]> {
     if (this.isMock) {
       return this.getMockDb().alerts;
     }
     const snap = await getDocs(collection(this.firestore, 'alerts'));
     return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
  }

  async addUser(userData: Partial<User>): Promise<void> {
    const uid = `u_${Date.now()}`;
    const newUser = {
        ...userData,
        uid: uid,
        status: UserStatus.ACTIVE,
        isOnline: false,
        created_at: new Date().toISOString(),
        password: 'password'
    };
    if (this.isMock) {
        const db = this.getMockDb();
        db.users.push(newUser);
        this.saveMockDb(db);
    } else {
        await setDoc(doc(this.firestore, 'users', uid), sanitizeData(newUser));
    }
  }

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    if (this.isMock) {
        const db = this.getMockDb();
        const idx = db.users.findIndex(u => u.uid === uid);
        if (idx !== -1) {
            db.users[idx] = { ...db.users[idx], ...data };
            this.saveMockDb(db);
        }
    } else {
        await setDoc(doc(this.firestore, 'users', uid), sanitizeData(data), { merge: true });
    }
  }

  async deleteUser(uid: string): Promise<void> {
    if (!uid) return;
    if (this.isMock) {
      const db = this.getMockDb();
      db.users = db.users.filter(u => u.uid !== uid);
      this.saveMockDb(db);
    } else {
      await deleteDoc(doc(this.firestore, 'users', uid));
    }
  }

  async createScanRequest(request: { target: string, agentType: AgentType, fileMetadata?: any }): Promise<string> {
    const user = this.activeUser;
    
    // Explicitly destructure metadata and DEFAULT all fields to ensure no undefined values are passed.
    // This is critical for preventing "Invalid nested entity" Firestore errors.
    const fileMetadataSafe = request.fileMetadata ? {
        name: request.fileMetadata.name || "unknown_file",
        mimeType: request.fileMetadata.mimeType || "application/octet-stream",
        data: request.fileMetadata.data || "",
        size: request.fileMetadata.size || 0
    } : null;

    const docData = sanitizeData({
      target: request.target,
      agentType: request.agentType,
      fileMetadata: fileMetadataSafe,
      status: 'pending',
      created_at: new Date().toISOString(),
      created_by: user?.uid || 'anonymous'
    });

    let docId: string;
    if (this.isMock) {
        docId = `req_${Date.now()}`;
        const db = this.getMockDb();
        db.scan_requests.push({ id: docId, ...docData });
        this.saveMockDb(db);
    } else {
        const ref = await addDoc(collection(this.firestore, 'scan_requests'), docData);
        docId = ref.id;
    }

    setTimeout(() => this.triggerScanProcessor({ id: docId, ...docData }), 500);
    return docId;
  }

  async approveAlert(alertId: string, decision: 'approved' | 'rejected'): Promise<void> {
    const user = this.activeUser;
    const updateData = sanitizeData({ 
        status: decision, 
        approvedBy: user?.name || 'Officer', 
        approvedAt: new Date().toISOString() 
    });

    if (this.isMock) {
        const db = this.getMockDb();
        const alertIdx = db.alerts.findIndex(a => a.id === alertId);
        if (alertIdx !== -1) {
            db.alerts[alertIdx] = { ...db.alerts[alertIdx], ...updateData };
            const reportIdx = db.agent_reports.findIndex(r => r.id === db.alerts[alertIdx].reportId);
            if (reportIdx !== -1) db.agent_reports[reportIdx].isApproved = (decision === 'approved');
            this.saveMockDb(db);
        }
    } else {
        await setDoc(doc(this.firestore, 'alerts', alertId), updateData, { merge: true });
        const alertRef = doc(this.firestore, 'alerts', alertId);
        const alertSnap = await getDoc(alertRef);
        if (alertSnap.exists()) {
            const rid = alertSnap.data().reportId;
            if (rid) {
                await setDoc(doc(this.firestore, 'agent_reports', rid), { isApproved: (decision === 'approved') }, { merge: true });
            }
        }
    }
  }

  private async triggerScanProcessor(scanDoc: any) {
    try {
      // Pass fileMetadata correctly
      const result = await runCentralBrainOrchestrator(
          scanDoc.agentType, 
          scanDoc.target, 
          scanDoc.fileMetadata 
      );
      
      const reportData = sanitizeData({ 
        ...result.report, 
        scanRequestId: scanDoc.id, 
        created_at: new Date().toISOString(), 
        created_by: scanDoc.created_by,
        isApproved: false 
      });

      // Special handling for Malware Agent requirement
      // Stores detailed execution log in a separate collection as requested
      if (scanDoc.agentType === AgentType.MALWARE_ANALYSIS) {
          try {
             // Create detailed payload matching requested structure
             const malwarePayload = {
                 analysis_id: scanDoc.id,
                 ...result.report, // Includes findings (Static, Dynamic, etc.)
                 timestamp: new Date().toISOString(),
                 user_id: scanDoc.created_by,
                 execution_time: '305s', // Simulated 5 min + overhead
                 tool_usage_log: ['YARA', 'CAPEv2', 'Volatility', 'Suricata']
             };

             if (this.isMock) {
                 const db = this.getMockDb();
                 if (!db.malware_analysis) db.malware_analysis = [];
                 db.malware_analysis.push(malwarePayload);
                 this.saveMockDb(db);
             } else {
                 const malwareRef = collection(this.firestore, 'malware_analysis');
                 await addDoc(malwareRef, sanitizeData(malwarePayload));
             }
          } catch(e) { console.error("Malware collection write failed", e); }
      }

      if (this.isMock) {
        const db = this.getMockDb();
        const reportId = `rep_${Date.now()}`;
        db.agent_reports.push({ id: reportId, ...reportData });
        if (result.alert) {
            db.alerts.push({ id: `alert_${Date.now()}`, ...result.alert, reportId, created_at: new Date().toISOString(), created_by: 'system' });
        }
        const reqIdx = db.scan_requests.findIndex(s => s.id === scanDoc.id);
        if (reqIdx !== -1) db.scan_requests[reqIdx].status = 'completed';
        this.saveMockDb(db);
      } else {
        const ref = await addDoc(collection(this.firestore, 'agent_reports'), reportData);
        if (result.alert) {
            await addDoc(collection(this.firestore, 'alerts'), sanitizeData({ ...result.alert, reportId: ref.id, created_at: new Date().toISOString(), created_by: 'system' }));
        }
        await setDoc(doc(this.firestore, 'scan_requests', scanDoc.id), { status: 'completed' }, { merge: true });
      }
    } catch (error: any) {
      console.error("[Processor] Error:", error);
    }
  }
}

export const db = FirebaseService.getInstance();

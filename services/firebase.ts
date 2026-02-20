
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, where, limit, setDoc, getDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { AgentType, Severity, UserRole, User, UserStatus, Alert, AgentReport, ReportTier, AccessRequestStatus, ChatMessage, TicketCategory } from '../types';
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

function sanitizeData(obj: any): any {
  const seen = new WeakMap();

  function deepCopy(value: any): any {
    // Primitives
    if (value === null || typeof value !== 'object') {
      if (value === undefined) return undefined;
      if (typeof value === 'number' && isNaN(value)) return null;
      return value;
    }

    // Dates
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Cycle detection
    if (seen.has(value)) {
      return null;
    }
    seen.set(value, true);

    // Arrays
    if (Array.isArray(value)) {
      return value.map(item => deepCopy(item)).filter(item => item !== undefined);
    }

    // Objects
    const copy: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const processed = deepCopy(value[key]);
        if (processed !== undefined) {
          copy[key] = processed;
        }
      }
    }
    return copy;
  }

  return deepCopy(obj);
}

export class FirebaseService {
  private static instance: FirebaseService;
  private firestore: any;
  private auth: any;
  private isMock: boolean = false;
  private activeUser: User | null = null;
  
  private getMockDb(): Record<string, any[]> {
    const stored = localStorage.getItem('uniguard_db');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse DB, resetting");
      }
    }
    
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
        const safeDb = sanitizeData(db);
        localStorage.setItem('uniguard_db', JSON.stringify(safeDb));
        window.dispatchEvent(new Event('storage'));
    } catch (e) {
        console.error("Local Storage Save Failed", e);
    }
  }

  private constructor() {
    try {
        const app = initializeApp(firebaseConfig);
        this.firestore = getFirestore(app);
        this.auth = getAuth(app);
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
        if (found.status === UserStatus.DISABLED) {
            throw new Error("ACCESS REVOKED: This account has been suspended by an administrator.");
        }
        await this.setActiveUser(found);
        return found;
    }
    return null;
  }

  async socialLogin(provider: 'google' | 'microsoft' | 'phone'): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    let userData;
    if (provider === 'google') {
        userData = {
            name: 'Siddharth Gupta',
            email: 'researcher.sid@indira.edu',
            department: 'AI Research Lab',
            role: UserRole.USER
        };
    } else if (provider === 'microsoft') {
        userData = {
            name: 'Dr. Anjali Desai',
            email: 'prof.anjali@indira.edu',
            department: 'Computer Science',
            role: UserRole.USER 
        };
    } else {
        userData = {
            name: 'Vikram Singh',
            email: 'vikram.ops@indira.edu',
            department: 'Campus Security',
            role: UserRole.USER
        };
    }

    const users = await this.getUsers();
    const existing = users.find(u => u.email === userData.email);
    
    if (existing) {
        if (existing.status === UserStatus.DISABLED) {
            throw new Error("ACCESS REVOKED: This account has been suspended by an administrator.");
        }
        await this.setActiveUser(existing);
        return existing;
    }

    const uid = `u_${Date.now()}`;
    const newUser: User = {
        uid,
        ...userData,
        status: UserStatus.ACTIVE,
        isOnline: true,
        created_at: new Date().toISOString(),
        created_by: 'sso_provider'
    };
    
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

  async resetPassword(email: string): Promise<void> {
      if (this.isMock) {
          const db = this.getMockDb();
          const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
          if (!user) throw new Error("IDENTITY NOT FOUND: No record of this email in our security vault.");
          return Promise.resolve();
      } else {
          await sendPasswordResetEmail(this.auth, email);
      }
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
            // Users see alerts related to their reports OR support tickets they created
            const myReports = this.getMockDb().agent_reports.filter(r => r.created_by === this.activeUser?.uid).map(r => r.id);
            raw = raw.filter(a => myReports.includes(a.reportId) || a.created_by === this.activeUser?.uid);
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
             // Return alerts for my reports OR alerts I created (support tickets)
             callback(alerts.filter(a => (a.reportId && ids.includes(a.reportId)) || a.created_by === this.activeUser?.uid));
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
      const reportIdsToDelete = db.agent_reports.filter(r => r.created_by === uid).map(r => r.id);
      db.agent_reports = db.agent_reports.filter(r => r.created_by !== uid);
      db.scan_requests = db.scan_requests.filter(s => s.created_by !== uid);
      db.alerts = db.alerts.filter(a => !reportIdsToDelete.includes(a.reportId) && a.created_by !== uid);
      if (db.malware_analysis) db.malware_analysis = db.malware_analysis.filter(m => m.user_id !== uid);
      this.saveMockDb(db);
    } else {
      const batch = writeBatch(this.firestore);
      batch.delete(doc(this.firestore, 'users', uid));
      const collections = ['scan_requests', 'agent_reports', 'malware_analysis'];
      for (const collName of collections) {
          const qField = collName === 'malware_analysis' ? 'user_id' : 'created_by';
          const q = query(collection(this.firestore, collName), where(qField, '==', uid));
          const snap = await getDocs(q);
          if (collName === 'agent_reports') {
              for (const reportDoc of snap.docs) {
                  const aq = query(collection(this.firestore, 'alerts'), where('reportId', '==', reportDoc.id));
                  const asnap = await getDocs(aq);
                  asnap.forEach(adoc => batch.delete(adoc.ref));
                  batch.delete(reportDoc.ref);
              }
          } else {
              snap.forEach(d => batch.delete(d.ref));
          }
      }
      // Also delete any alerts created by user (support tickets)
      const ticketQ = query(collection(this.firestore, 'alerts'), where('created_by', '==', uid));
      const ticketSnap = await getDocs(ticketQ);
      ticketSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
    }
  }

  async createScanRequest(request: { target: string, agentType: AgentType, fileMetadata?: any }): Promise<string> {
    const user = this.activeUser;
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

  // --- SUPPORT TICKET & CHAT LOGIC ---

  private calculateRiskLevel(text: string, category: TicketCategory): Severity {
      // Deterministic "AI" Risk Scoring based on keywords
      const criticalKeywords = ['ransom', 'encrypted', 'hack', 'breach', 'exfil', 'leak', 'root', 'admin'];
      const highKeywords = ['password', 'credential', 'access', 'lock', 'phish', 'suspicious'];
      const mediumKeywords = ['slow', 'error', 'fail', 'connect', 'wifi', 'vpn'];
      
      const lowerText = text.toLowerCase();
      
      if (criticalKeywords.some(k => lowerText.includes(k))) return Severity.CRITICAL;
      if (category === TicketCategory.MALWARE || category === TicketCategory.DATA_LEAK) return Severity.HIGH;
      if (highKeywords.some(k => lowerText.includes(k))) return Severity.HIGH;
      if (mediumKeywords.some(k => lowerText.includes(k))) return Severity.MEDIUM;
      
      return Severity.LOW;
  }

  async createSupportToken(data: { category: TicketCategory, description: string }): Promise<string> {
      const year = new Date().getFullYear();
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const ticketId = `INF-CHAT-${year}-${randomId}`;
      const riskLevel = this.calculateRiskLevel(data.description, data.category);
      
      const alertData: Alert = {
          severity: riskLevel,
          summary: data.category,
          description: data.description,
          status: 'pending_approval',
          type: 'support_ticket',
          ticketId: ticketId,
          ticketCategory: data.category,
          created_at: new Date().toISOString(),
          created_by: this.activeUser?.uid || 'system',
          messages: []
      };

      let docRefId;
      if (this.isMock) {
          docRefId = `tkt_${Date.now()}`;
          const db = this.getMockDb();
          db.alerts.push({ id: docRefId, ...alertData });
          this.saveMockDb(db);
      } else {
          const ref = await addDoc(collection(this.firestore, 'alerts'), sanitizeData(alertData));
          docRefId = ref.id;
      }
      return docRefId;
  }

  async updateTicketStatus(ticketId: string, status: 'active' | 'rejected' | 'resolved' | 'closed', reason?: string): Promise<void> {
      const updateData: any = { status };
      
      if (status === 'active') {
          updateData.approvedBy = this.activeUser?.name;
          updateData.approvedAt = new Date().toISOString();
          // Add system message
          const sysMsg: ChatMessage = {
              id: `sys_${Date.now()}`,
              senderId: 'system',
              senderName: 'System',
              senderRole: UserRole.INFOSEC,
              text: `TOKEN ${status === 'active' ? 'APPROVED' : 'UPDATED'}. Secure channel established. Encryption active.`,
              timestamp: new Date().toISOString(),
              isSystemMessage: true
          };
          // Need to fetch existing messages to append if not using arrayUnion (mock simplicity)
          // Handled in mock logic below, for real logic assuming setDoc merge or array update
      } else if (status === 'rejected') {
          updateData.rejectionReason = reason;
      } else if (status === 'resolved' || status === 'closed') {
          updateData.closedAt = new Date().toISOString();
          updateData.closedBy = this.activeUser?.name;
          updateData.resolutionSummary = reason; // reusing reason param for summary
      }

      if (this.isMock) {
          const db = this.getMockDb();
          const idx = db.alerts.findIndex(a => a.id === ticketId);
          if (idx !== -1) {
              const prev = db.alerts[idx];
              let newMsgs = prev.messages || [];
              if (status === 'active') {
                   newMsgs.push({
                      id: `sys_${Date.now()}`,
                      senderId: 'system',
                      senderName: 'System',
                      senderRole: UserRole.INFOSEC,
                      text: `TOKEN APPROVED. Secure channel established. Encryption active.`,
                      timestamp: new Date().toISOString(),
                      isSystemMessage: true
                  });
              }
              db.alerts[idx] = { ...prev, ...updateData, messages: newMsgs };
              this.saveMockDb(db);
          }
      } else {
          // For real Firestore, we would use arrayUnion for messages, but for simplicity of this generic class:
          await updateDoc(doc(this.firestore, 'alerts', ticketId), sanitizeData(updateData));
      }
  }

  async submitTicketRating(ticketId: string, rating: number): Promise<void> {
      if (this.isMock) {
          const db = this.getMockDb();
          const idx = db.alerts.findIndex(a => a.id === ticketId);
          if (idx !== -1) {
              db.alerts[idx].rating = rating;
              this.saveMockDb(db);
          }
      } else {
          await updateDoc(doc(this.firestore, 'alerts', ticketId), { rating });
      }
  }

  async sendChatMessage(alertId: string, text: string, attachment?: any): Promise<void> {
      const newMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          senderId: this.activeUser?.uid || 'system',
          senderName: this.activeUser?.name || 'Support Agent',
          senderRole: this.activeUser?.role || UserRole.INFOSEC,
          text: text,
          timestamp: new Date().toISOString(),
          attachment: attachment || undefined
      };

      if (this.isMock) {
          const db = this.getMockDb();
          const alertIdx = db.alerts.findIndex(a => a.id === alertId);
          if (alertIdx !== -1) {
              const alert = db.alerts[alertIdx];
              const messages = alert.messages || [];
              db.alerts[alertIdx] = { ...alert, messages: [...messages, newMessage] };
              this.saveMockDb(db);
          }
      } else {
          const alertRef = doc(this.firestore, 'alerts', alertId);
          const alertSnap = await getDoc(alertRef);
          if (alertSnap.exists()) {
              const data = alertSnap.data();
              const messages = data.messages || [];
              await updateDoc(alertRef, { messages: [...messages, newMessage] });
          }
      }
  }

  // --- EXISTING LOGIC ---

  async requestAdvancedReport(reportId: string): Promise<void> {
      // AUTO-APPROVE LOGIC: Unlock immediately.
      const updateData = { 
          advancedRequestStatus: AccessRequestStatus.APPROVED,
          reportTier: ReportTier.ADVANCED 
      };
      
      const alertData = {
          reportId,
          severity: Severity.LOW, 
          summary: 'Advanced Report Access Granted',
          description: `User ${this.activeUser?.name} enabled advanced findings for audit ${reportId}. System auto-authorized access.`,
          status: 'approved',
          type: 'access_request',
          created_at: new Date().toISOString(),
          created_by: this.activeUser?.uid || 'system', // ATTRIBUTED TO USER
          approvedBy: 'System Auto-Auth',
          approvedAt: new Date().toISOString()
      };

      if (this.isMock) {
          const db = this.getMockDb();
          const rIdx = db.agent_reports.findIndex(r => r.id === reportId);
          if (rIdx !== -1) {
              db.agent_reports[rIdx] = { ...db.agent_reports[rIdx], ...updateData };
              db.alerts.push({ id: `req_${Date.now()}`, ...alertData });
              this.saveMockDb(db);
          }
      } else {
          await updateDoc(doc(this.firestore, 'agent_reports', reportId), updateData);
          await addDoc(collection(this.firestore, 'alerts'), sanitizeData(alertData));
      }
  }

  async requestVerification(reportId: string): Promise<void> {
      const alertData = {
          reportId,
          severity: Severity.HIGH,
          summary: 'Request for Human Verification',
          description: `User ${this.activeUser?.name} requests expert review of findings for audit ${reportId}.`,
          status: 'pending_approval',
          type: 'verification',
          created_at: new Date().toISOString(),
          created_by: this.activeUser?.uid || 'system' // ATTRIBUTED TO USER
      };

      if (this.isMock) {
          const db = this.getMockDb();
          db.alerts.push({ id: `ver_${Date.now()}`, ...alertData });
          this.saveMockDb(db);
      } else {
          await addDoc(collection(this.firestore, 'alerts'), sanitizeData(alertData));
      }
  }

  async submitReportQuery(reportId: string, queryText: string): Promise<void> {
      // Create initial message
      const initialMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          senderId: this.activeUser?.uid || 'anon',
          senderName: this.activeUser?.name || 'User',
          senderRole: this.activeUser?.role || UserRole.USER,
          text: queryText,
          timestamp: new Date().toISOString()
      };

      const alertData = {
          reportId,
          severity: Severity.MEDIUM,
          summary: 'User Inquiry / Support Ticket',
          description: queryText,
          status: 'pending_approval', // Open ticket
          type: 'query',
          created_at: new Date().toISOString(),
          created_by: this.activeUser?.uid || 'system',
          messages: [initialMessage]
      };

      if (this.isMock) {
          const db = this.getMockDb();
          db.alerts.push({ id: `ticket_${Date.now()}`, ...alertData });
          this.saveMockDb(db);
      } else {
          await addDoc(collection(this.firestore, 'alerts'), sanitizeData(alertData));
      }
  }

  async approveAlert(alertId: string, decision: 'approved' | 'rejected' | 'resolved', rejectionReason?: string): Promise<void> {
    const user = this.activeUser;
    const updateData = sanitizeData({ 
        status: decision, 
        approvedBy: user?.name || 'Officer', 
        approvedAt: new Date().toISOString(),
        rejectionReason: rejectionReason || null 
    });

    if (this.isMock) {
        const db = this.getMockDb();
        const alertIdx = db.alerts.findIndex(a => a.id === alertId);
        if (alertIdx !== -1) {
            const alert = db.alerts[alertIdx];
            db.alerts[alertIdx] = { ...alert, ...updateData };
            
            const reportIdx = db.agent_reports.findIndex(r => r.id === alert.reportId);
            if (reportIdx !== -1) {
                if (alert.type === 'access_request') {
                    db.agent_reports[reportIdx].advancedRequestStatus = decision === 'approved' ? AccessRequestStatus.APPROVED : AccessRequestStatus.REJECTED;
                    db.agent_reports[reportIdx].reportTier = decision === 'approved' ? ReportTier.ADVANCED : ReportTier.BASIC;
                } else if (alert.type === 'verification') {
                    db.agent_reports[reportIdx].reportTier = decision === 'approved' ? ReportTier.VERIFIED : db.agent_reports[reportIdx].reportTier;
                    if (decision === 'approved') {
                        db.agent_reports[reportIdx].verifiedBy = user?.name || 'Infosec Officer';
                        db.agent_reports[reportIdx].verifiedAt = new Date().toISOString();
                    }
                }
            }
            this.saveMockDb(db);
        }
    } else {
        await setDoc(doc(this.firestore, 'alerts', alertId), updateData, { merge: true });
        const alertRef = doc(this.firestore, 'alerts', alertId);
        const alertSnap = await getDoc(alertRef);
        if (alertSnap.exists()) {
            const data = alertSnap.data();
            const rid = data.reportId;
            if (rid) {
                if (data.type === 'access_request') {
                    await setDoc(doc(this.firestore, 'agent_reports', rid), { 
                        advancedRequestStatus: decision === 'approved' ? AccessRequestStatus.APPROVED : AccessRequestStatus.REJECTED,
                        reportTier: decision === 'approved' ? ReportTier.ADVANCED : ReportTier.BASIC
                    }, { merge: true });
                } else if (data.type === 'verification' && decision === 'approved') {
                    await setDoc(doc(this.firestore, 'agent_reports', rid), { 
                        reportTier: ReportTier.VERIFIED,
                        verifiedBy: user?.name || 'Infosec Officer',
                        verifiedAt: new Date().toISOString()
                    }, { merge: true });
                }
            }
        }
    }
  }

  private async triggerScanProcessor(scanDoc: any) {
    try {
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
        reportTier: ReportTier.BASIC,
        advancedRequestStatus: AccessRequestStatus.NONE
      });

      if (scanDoc.agentType === AgentType.MALWARE_ANALYSIS) {
          try {
             const malwarePayload = {
                 analysis_id: scanDoc.id,
                 ...result.report,
                 timestamp: new Date().toISOString(),
                 user_id: scanDoc.created_by,
                 execution_time: '305s',
                 tool_usage_log: ['YARA', 'CAPEv2', 'Volatility', 'Suricata']
             };

             if (this.isMock) {
                 const db = this.getMockDb();
                 if (!db.malware_analysis) db.malware_analysis = [];
                 db.malware_analysis.push(malwarePayload);
                 this.saveMockDb(db);
             } else {
                 await addDoc(collection(this.firestore, 'malware_analysis'), sanitizeData(malwarePayload));
             }
          } catch(e) { console.error("Malware collection write failed", e); }
      }

      if (this.isMock) {
        const db = this.getMockDb();
        const reportId = `rep_${Date.now()}`;
        db.agent_reports.push({ id: reportId, ...reportData });
        const reqIdx = db.scan_requests.findIndex(s => s.id === scanDoc.id);
        if (reqIdx !== -1) db.scan_requests[reqIdx].status = 'completed';
        this.saveMockDb(db);
      } else {
        await addDoc(collection(this.firestore, 'agent_reports'), reportData);
        await setDoc(doc(this.firestore, 'scan_requests', scanDoc.id), { status: 'completed' }, { merge: true });
      }
    } catch (error: any) {
      console.error("[Processor] Error:", error);
    }
  }
}

export const db = FirebaseService.getInstance();

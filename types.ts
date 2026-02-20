
export enum UserRole {
  USER = 'user',
  INFOSEC = 'infosec',
  ADMIN = 'admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled'
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AgentType {
  WEB_SCANNER = 'web_repository_scanner',
  CODE_ANALYST = 'code_security_analyst',
  LOG_ANALYSIS = 'log_analyst',
  MALWARE_ANALYSIS = 'malware_detection_agent',
  COMPLIANCE = 'compliance_checker'
}

export enum ReportTier {
  BASIC = 'basic',       // Level 1: Score & Summary only
  ADVANCED = 'advanced', // Level 2: Technical Findings unlocked
  VERIFIED = 'verified'  // Level 3: Human reviewed
}

export enum AccessRequestStatus {
  NONE = 'none',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum TicketCategory {
  MALWARE = 'Malware Infection',
  PHISHING = 'Phishing Attempt',
  ACCESS = 'Access / Login Issue',
  DATA_LEAK = 'Data Leakage',
  SYSTEM_ALERT = 'System Alert',
  OTHER = 'Other Inquiry'
}

export interface FirestoreDocument {
  id?: string;
  created_at: string;
  created_by: string;
}

export interface User extends FirestoreDocument {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  isOnline: boolean;
  lastActive?: string;
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  confidence: number;
  remediation: string;
  impact?: string;
  category?: string;
  approved?: boolean;
  agentType?: string;
  cvss_vector?: string; 
  cvss_score?: number;  
}

export interface AgentReport extends FirestoreDocument {
  scanRequestId: string;
  agentType: AgentType;
  findings: SecurityFinding[];
  summary: string;
  reasoning: string; // Internal logic, shown in Advanced
  globalSeverity: Severity;
  rawOutput: string;
  target?: string;
  
  // Tiered Reporting Fields
  reportTier: ReportTier; 
  advancedRequestStatus: AccessRequestStatus;
  
  // Verification Metadata
  verifiedBy?: string;
  verifiedAt?: string;
  
  // Risk Engine Aggregates
  weightedRiskScore?: number; // 0-100
  healthScore?: number;       // 0-100 (100 = Secure)
  compoundThreat?: boolean;
}

export interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // Base64
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  attachment?: ChatAttachment;
  isSystemMessage?: boolean;
}

export interface Alert extends FirestoreDocument {
  reportId?: string;
  severity: Severity;
  summary: string;
  description: string;
  status: 'pending_approval' | 'active' | 'approved' | 'rejected' | 'resolved' | 'closed'; // Extended status
  type: 'verification' | 'access_request' | 'query' | 'support_ticket'; 
  
  // Ticket Specifics
  ticketId?: string; // Human readable INF-CHAT-XXXX
  ticketCategory?: TicketCategory;
  messages?: ChatMessage[];
  
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Resolution Metrics
  resolutionSummary?: string;
  rating?: number; // 1-5
  closedAt?: string;
  closedBy?: string;
}

export interface CorrelationReport {
  id: string;
  target: string;
  summary: string;
  reasoning: string;
  overallRiskScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

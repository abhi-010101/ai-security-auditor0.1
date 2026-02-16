
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

export enum ScanStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
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
  // CVSS Risk Engine Fields
  cvss_vector?: string; // e.g., "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
  cvss_score?: number;  // 0.0 - 10.0
}

export interface AgentReport extends FirestoreDocument {
  scanRequestId: string;
  agentType: AgentType;
  findings: SecurityFinding[];
  summary: string;
  reasoning: string;
  globalSeverity: Severity;
  rawOutput: string;
  target?: string;
  isApproved?: boolean; 
  // Risk Engine Aggregates
  weightedRiskScore?: number; // 0-100
  healthScore?: number;       // 0-100 (100 = Secure)
  compoundThreat?: boolean;
}

export interface Alert extends FirestoreDocument {
  reportId: string;
  severity: Severity;
  summary: string;
  description: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
}

export interface CorrelationReport {
  id: string;
  target: string;
  summary: string;
  reasoning: string;
  overallRiskScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

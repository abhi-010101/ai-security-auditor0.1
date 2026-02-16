
import React from 'react';
import { Severity, AgentType } from './types';

export const COLORS = {
  UNIVERSITY_TEAL: '#006778',
  UNIVERSITY_NAVY: '#003B49',
  UNIVERSITY_GOLD: '#EAA400',
  SEVERITY: {
    [Severity.LOW]: '#3b82f6',
    [Severity.MEDIUM]: '#EAA400', // Gold for Medium
    [Severity.HIGH]: '#f97316',   // Orange for High
    [Severity.CRITICAL]: '#dc2626', // Red for Critical
  }
};

export const AGENT_INFO = {
  [AgentType.WEB_SCANNER]: {
    name: 'Web Repository Scanner',
    tools: ['Semgrep', 'SonarQube', 'OWASP ZAP'],
    description: 'Scans repos for OWASP Top 10 web vulnerabilities.'
  },
  [AgentType.CODE_ANALYST]: {
    name: 'Code Security Analyst',
    tools: ['SAST Engines', 'Pattern Matchers'],
    description: 'Identifies insecure coding patterns and SAST issues.'
  },
  [AgentType.LOG_ANALYSIS]: {
    name: 'SOC Log Agent',
    tools: ['Zeek', 'Suricata', 'ELK'],
    description: 'Detects anomalies, brute force, and lateral movement.'
  },
  [AgentType.MALWARE_ANALYSIS]: {
    name: 'Malware Analysis Agent',
    tools: ['CAPEv2', 'YARA', 'Volatility', 'Suricata'],
    description: 'Sandbox execution with memory forensics & network traffic analysis.'
  },
  [AgentType.COMPLIANCE]: {
    name: 'Compliance Checker',
    tools: ['OpenSCAP', 'CIS Benchmarks', 'OSQuery'],
    description: 'Checks against ISO 27001 and university policies.'
  }
};

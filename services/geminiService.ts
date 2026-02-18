
import { GoogleGenAI, Type } from "@google/genai";
import { AgentType, Severity, SecurityFinding } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// UPDATED: Using 'flash' models to prevent 429 RESOURCE_EXHAUSTED errors
// 'gemini-3-flash-preview' offers higher rate limits and lower latency suitable for high-volume agent tasks.
const AGENT_MODEL_REASONING = 'gemini-3-flash-preview'; 
const ORCHESTRATOR_MODEL = 'gemini-3-flash-preview';

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Enhanced error handling for Rate Limits (429)
      const isRateLimit = error?.status === 429 || 
                          error?.message?.includes('429') || 
                          error?.message?.includes('quota') || 
                          error?.status === 'RESOURCE_EXHAUSTED';

      if (isRateLimit) {
         console.warn(`[Gemini Service] Rate limit/Quota exceeded (Attempt ${i + 1}). Backing off...`);
         // Longer backoff for rate limits: 5s, 10s, 20s
         const delay = (i + 1) * 5000; 
         await new Promise(resolve => setTimeout(resolve, delay));
      } else {
         console.warn(`[Gemini Service] Attempt ${i + 1} failed:`, error);
         if (i < maxRetries - 1) {
            const delay = Math.pow(2, i + 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
         }
      }
    }
  }
  throw lastError;
}

function cleanJson(text: string | undefined): string {
  if (!text) return '[]';
  let clean = text.trim();
  if (clean.includes('```')) {
    const matches = clean.match(/```(?:json)?([\s\S]*?)```/);
    if (matches && matches[1]) clean = matches[1].trim();
  }
  return clean;
}

// Helper to decode Base64 to Text safely
function decodeBase64ToText(base64: string): string {
  try {
    const binString = atob(base64);
    // Properly handle UTF-8 sequences if present
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.warn("Base64 decode failed, returning raw string stub.");
    return "";
  }
}

// Helper to decompress GZIP
async function decompressGzip(base64: string): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  } catch (e) {
    console.warn("GZIP Decompression failed:", e);
    return null;
  }
}

// --- RISK SCORING ENGINE (DETERMINISTIC) ---
interface RiskMetrics {
    weightedRiskScore: number;
    healthScore: number;
    compoundThreat: boolean;
    criticalCount: number;
    highCount: number;
}

function calculateRiskEngineMetrics(findings: SecurityFinding[]): RiskMetrics {
    if (findings.length === 0) {
        return { weightedRiskScore: 0, healthScore: 100, compoundThreat: false, criticalCount: 0, highCount: 0 };
    }

    let totalWeightedScore = 0;
    let criticalCount = 0;
    let highCount = 0;
    let maxPossibleScore = 0;

    findings.forEach(f => {
        const baseScore = f.cvss_score || 0;
        let weight = 1.0;

        switch (f.severity) {
            case Severity.CRITICAL:
                weight = 1.5;
                criticalCount++;
                break;
            case Severity.HIGH:
                weight = 1.2;
                highCount++;
                break;
            case Severity.MEDIUM:
                weight = 1.0;
                break;
            case Severity.LOW:
                weight = 0.8;
                break;
        }

        totalWeightedScore += (baseScore * weight);
        maxPossibleScore += (10.0 * 1.5); // Max CVSS * Max Weight
    });

    // Normalize Weighted Risk Score (0-100) based on density
    let weightedRiskScore = (totalWeightedScore / (findings.length * 15)) * 100;
    
    // Scale up based on volume (Risk Density)
    const volumeFactor = Math.min(findings.length / 5, 2.0); 
    weightedRiskScore = Math.min(weightedRiskScore * volumeFactor, 100);

    // Compound Threat Logic
    const compoundThreat = (criticalCount >= 2) || (criticalCount > 0 && highCount > 2);
    if (compoundThreat) {
        weightedRiskScore = Math.min(weightedRiskScore * 1.25, 100); // Increase by 25%
    }

    // Health Score is inverse of Risk
    const healthScore = Math.round(100 - weightedRiskScore);

    return {
        weightedRiskScore: Math.round(weightedRiskScore),
        healthScore,
        compoundThreat,
        criticalCount,
        highCount
    };
}

// --- AGENT PERSONAS & TOOL DEFINITIONS ---

const AGENT_PROMPTS = {
  [AgentType.WEB_SCANNER]: `
    ROLE: DAST Orchestrator (Vulnerability Scanner Agent).
    AVAILABLE TOOLS: OWASP ZAP, Nuclei, Nikto.
    WORKFLOW:
    1. Analyze target.
    2. Select tool.
    3. EXECUTE vulnerability analysis.
    4. CALCULATE CVSS v3.1: For each finding, determine vector and base score (0.0-10.0).
    5. OUTPUT: Structured JSON with CVSS details.
  `,

  [AgentType.CODE_ANALYST]: `
    ROLE: SAST Orchestrator.
    AVAILABLE TOOLS: Semgrep, Bandit, Gitleaks.
    WORKFLOW:
    1. Analyze code/context.
    2. Detect language & Select tool.
    3. EXECUTE static analysis.
    4. CALCULATE CVSS v3.1: Estimate impact on Confidentiality, Integrity, Availability.
    5. OUTPUT: Structured JSON with CVSS details.
  `,

  [AgentType.LOG_ANALYSIS]: `
    You are an Advanced SOC Security Analysis Engine.
    Your task is to analyze uploaded input (logs, code, repository files, system configuration, malware indicators, or compliance data) and generate a detailed professional security report.

    Follow these instructions strictly:
    - Accept all file inputs without rejecting format.
    - Perform deep multi-layer analysis.
    - Increase detection sensitivity.
    - Expand findings beyond obvious matches.
    - Correlate related events.
    - Assign severity levels (Low / Medium / High / Critical).
    - Map findings to MITRE ATT&CK where applicable.
    - Provide risk score (1–10) mapped to CVSS (0-10).
    - Provide business impact explanation.
    - Provide remediation steps.

    ANALYSIS GUIDELINES:
    1. Identify anomalies, behavior patterns, privilege misuse, data exfiltration, lateral movement, and persistence attempts.
    2. For CODE: check injection, insecure functions, weak encryption, unsafe file handling.
    3. For LOGS: check brute force, port scan, unusual login time, geo anomalies, repeated connection patterns.
    4. For MALWARE/BINARIES: check encoded commands, unsigned binaries, suspicious parent-child process, registry modification, service creation.
    5. For COMPLIANCE: compare against baseline security best practices and highlight missing controls.

    MANDATORY OUTPUT FORMAT (JSON Array of Findings):
    You must output a JSON ARRAY of objects (SecurityFinding). Do not output free-form text.
    Map your analysis into the following schema for each distinct finding:

    [{
       "id": "unique_id",
       "title": "Finding Title (e.g. 'Brute Force Detection', 'SQL Injection Risk')",
       "description": "DETAILED TECHNICAL DESCRIPTION including:\n- Attack Chain Analysis (if applicable)\n- Specific evidence (lines of code, log entries)\n- Affected Systems\n- Indicators of Compromise (IOCs)\n- Compliance Status (Compliant/Non-Compliant)",
       "severity": "low|medium|high|critical",
       "confidence": 0-100,
       "impact": "Business Impact Explanation (e.g. 'Data loss risk', 'Service downtime').",
       "remediation": "Step-by-step Remediation Recommendations + Long-Term Improvements.",
       "category": "MITRE ATT&CK Technique (e.g. T1110 - Brute Force)",
       "tool_used": "SOC_AI_Engine",
       "cvss_vector": "CVSS:3.1/...",
       "cvss_score": 0.0-10.0 (Map your 1-10 risk score here)
    }]

    If the input appears clean, you MUST still generate a "Security Baseline Assessment" finding with Severity: LOW, outlining what was checked and confirming the clean status.
  `,

  [AgentType.MALWARE_ANALYSIS]: `
    You are the Malware Analysis Agent v2.0 for UniGuard AI (Production Environment).
    
    🛠 TOOL STACK (MANDATORY USAGE):
    1. YARA (Static Signatures) -> Primary Static Scanner
    2. CAPEv2 (Dynamic Sandbox) -> Primary Dynamic Execution
    3. Volatility (Memory Forensics) -> Post-Execution Memory Analysis
    4. Suricata (Network Traffic) -> C2 & Exfiltration Detection
    5. ClamAV (Fallback)

    TARGET: Analyze the provided file/context. If the file is a ZIP/Archive, simulate extraction and analysis of its contents.

    🧠 TOOL SELECTION LOGIC:
    - If executable (.exe, .dll) -> Full Stack (YARA -> CAPEv2 -> Volatility -> Suricata).
    - If document (.docm, .pdf) -> YARA -> CAPEv2.
    - If script (.js, .ps1, .py) -> YARA -> CAPEv2.
    - If hash-only -> IOC Database Lookup.

    📦 ANALYSIS PIPELINE & OUTPUT MAPPING:
    Perform the analysis phases below and map them into the 'SecurityFinding' output format.
    
    PHASE 1: STATIC ANALYSIS (YARA/ClamAV)
    - Compute SHA256.
    - Extract Metadata (Headers, Imports).
    - Check YARA rules.
    - OUTPUT: Create a finding titled "Static Analysis Results". Description must include YARA matches and Metadata.

    PHASE 2: DYNAMIC ANALYSIS (CAPEv2 Sandbox)
    - Simulate execution in isolated KVM (5 min timeout).
    - Monitor Process Creation, Registry Mod (Persistence), File System.
    - OUTPUT: Create a finding titled "Dynamic Behavioral Analysis". Description must list processes spawned, registry keys, and evasion attempts.

    PHASE 3: MEMORY FORENSICS (Volatility)
    - Analyze memory snapshot.
    - Detect Injected Processes (malfind), Hidden Modules (ldrmodules).
    - OUTPUT: Create a finding titled "Memory Forensics". Description must detail injection techniques.

    PHASE 4: NETWORK INSPECTION (Suricata)
    - Analyze PCAP.
    - Detect C2 domains, Beaconing, Data Exfiltration.
    - OUTPUT: Create a finding titled "Network Traffic Analysis". Description must list C2 IPs/Domains.

    Risk Assessment:
    - Provide a suggested CVSS v3.1 Vector and Score for each finding.
    - Map to MITRE ATT&CK categories.

    MANDATORY OUTPUT JSON:
    Return an array of 'SecurityFinding' objects. Do NOT return unstructured text.
  `,

  [AgentType.COMPLIANCE]: `
    ROLE: GRC Auditor.
    AVAILABLE TOOLS: OpenSCAP, Wazuh Compliance.
    WORKFLOW:
    1. Map to ISO 27001/SOC 2.
    2. Identify gaps.
    3. CALCULATE CVSS v3.1: Based on compliance risk.
    4. OUTPUT: Structured JSON.
  `
};

// Helper to determine if a file is text-based based on extension
function isTextExtension(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const textExts = [
        'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'log', 'ini', 'conf', 
        'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'rb', 
        'php', 'go', 'rs', 'swift', 'kt', 'sh', 'bat', 'ps1', 'sql', 'html', 'css'
    ];
    return textExts.includes(ext);
}

async function executeAgent(
  agentType: AgentType, 
  input: string, 
  fileData?: { name: string, data: string, mimeType?: string }
): Promise<SecurityFinding[]> {
  
  const systemInstruction = AGENT_PROMPTS[agentType];
  const parts: any[] = [];
  let userPromptText = `TARGET/CONTEXT: ${input}`;

  if (fileData) {
      let mime = (fileData.mimeType || '').toLowerCase();
      let processedTextContent: string | null = null;

      // 1. Handle GZIP Explicit Decompression
      if (mime.includes('gzip')) {
          const decompressed = await decompressGzip(fileData.data);
          if (decompressed) {
              processedTextContent = decompressed;
              userPromptText += `\n\n=== ANALYZING DECOMPRESSED LOG FILE: ${fileData.name} ===\n`;
          } else {
              userPromptText += `\n\n[SYSTEM WARNING]: File '${fileData.name}' is GZIP compressed but could not be decompressed. Analysis limited to metadata.`;
          }
      }

      // 2. Check for Text Types
      const isTextMime = mime.startsWith('text/') || 
                         mime.includes('csv') || 
                         mime.includes('json') || 
                         mime.includes('xml') || 
                         mime.includes('script') ||
                         mime.includes('javascript') ||
                         mime === 'application/x-httpd-php';
                         
      const isTextFile = isTextMime || isTextExtension(fileData.name);

      if (processedTextContent) {
          // Add Decompressed Text
          // Truncate safely if massive to avoid token limits on the input side (though 1MB is usually fine for Gemini-Flash)
          userPromptText += `${processedTextContent.substring(0, 100000)}\n=== END FILE CONTENT ===\n`; 
      } else if (isTextFile) {
          // Convert Base64 back to text for better LLM comprehension of Code/Logs/CSV
          const decodedContent = decodeBase64ToText(fileData.data);
          userPromptText += `\n\n=== ANALYZING FILE: ${fileData.name} (${mime}) ===\n${decodedContent}\n=== END FILE CONTENT ===\n`;
      } else {
          // 3. Binary Content - FILTER UNSUPPORTED TYPES
          // Gemini InlineData supports: PDF, Images, Audio, Video.
          // It does NOT support: application/gzip, application/zip, application/octet-stream (generic), etc.
          
          const supportedMimePrefixes = [
              'application/pdf',
              'image/',
              'audio/',
              'video/'
          ];
          
          const isSupportedBinary = supportedMimePrefixes.some(prefix => mime.startsWith(prefix));

          if (isSupportedBinary) {
              userPromptText += `\n\nANALYZING ATTACHED FILE: ${fileData.name} (${mime})`;
              parts.push({
                  inlineData: {
                      mimeType: mime || 'application/octet-stream',
                      data: fileData.data 
                  }
              });
          } else { 
              // Handle ZIPs and other archives for simulation
              if (mime.includes('zip') || mime.includes('compressed') || mime.includes('archive')) {
                  userPromptText += `\n\n[SYSTEM NOTE]: The user has uploaded an Archive/ZIP file named '${fileData.name}' (${mime}). 
                  You are running in a Simulated Sandbox environment. 
                  ACTION REQUIRED: Assume valid extraction. SIMULATE the analysis of a suspicious payload contained within this archive (e.g. a hidden .exe or obfuscated script). 
                  Generate findings based on the likely contents implied by the filename or standard malware packaging techniques.`;
              } else {
                  // Other unsupported binaries
                  userPromptText += `\n\n[SYSTEM NOTE]: The file '${fileData.name}' (${mime}) is a binary format not supported for direct deep analysis. Analysis is provided based on filename and context.`;
              }
          }
      }
  }

  userPromptText += `
    TASK: Execute tools and analysis.
    REQUIREMENT: You MUST calculate the CVSS v3.1 Base Score and Vector String for every finding.
    
    Output Format Example:
    {
       "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
       "cvss_score": 9.8,
       ...
    }
  `;

  // Add text prompt as the first part or append to it
  parts.unshift({ text: userPromptText });

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: AGENT_MODEL_REASONING,
      contents: { parts }, // Pass parts array
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 2048 },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              severity: { type: Type.STRING, enum: Object.values(Severity) },
              confidence: { type: Type.NUMBER },
              impact: { type: Type.STRING },
              remediation: { type: Type.STRING },
              category: { type: Type.STRING },
              tool_used: { type: Type.STRING },
              cvss_vector: { type: Type.STRING, description: "CVSS v3.1 Vector String" },
              cvss_score: { type: Type.NUMBER, description: "CVSS Base Score (0.0-10.0)" }
            },
            required: ["id", "title", "description", "severity", "confidence", "impact", "remediation", "category", "tool_used", "cvss_vector", "cvss_score"]
          }
        }
      }
    });

    try {
        const text = cleanJson(response.text);
        return JSON.parse(text);
    } catch (e) { 
        console.error("JSON Parse Error in Agent:", e);
        return []; 
    }
  });
}

export async function runCentralBrainOrchestrator(
  agentType: AgentType, 
  input: string,
  fileData?: { name: string, data: string, mimeType?: string }
): Promise<{ report: any, alert: any }> {
  
  // 1. EXECUTE SPECIALIZED AGENT with Multimodal Support
  let findings = await executeAgent(agentType, input, fileData);
  
  // Tag findings
  findings = findings.map(f => ({ ...f, agentType }));

  // 2. RISK ENGINE CALCULATION (Deterministic)
  const riskMetrics = calculateRiskEngineMetrics(findings);

  // 3. RUN CENTRAL BRAIN (Narrative Generation based on Metrics)
  const brainPrompt = `
    ROLE: Central Security Orchestrator (CISO Brain).
    
    INPUT DATA:
    - Findings Count: ${findings.length}
    - Calculated Health Score: ${riskMetrics.healthScore}/100
    - Weighted Risk Score: ${riskMetrics.weightedRiskScore}/100
    - Compound Threat Detected: ${riskMetrics.compoundThreat}
    - Critical Issues: ${riskMetrics.criticalCount}
    
    FINDINGS LIST:
    ${JSON.stringify(findings)}
    
    TASK:
    1. Analyze the Risk Metrics provided.
    2. Write a VERY SIMPLE, NON-TECHNICAL Executive Summary (max 3 sentences) for a general user. Justify the Health Score in plain language. Do not use technical jargon like "CVSS", "MITRE", or specific exploit names unless absolutely necessary. Focus on whether it is safe or not.
    3. If Compound Threat is true, explain broadly why.
    4. Determine if an ALERT is required (Status < 75 usually requires alert).
    5. Provide Global Severity based on the calculated risk.
  `;

  const correlationResp = await withRetry(async () => {
    return await ai.models.generateContent({
      model: ORCHESTRATOR_MODEL,
      contents: brainPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            globalSeverity: { type: Type.STRING, enum: Object.values(Severity) },
            requiresAlert: { type: Type.BOOLEAN },
            reasoning: { type: Type.STRING },
          },
          required: ["summary", "globalSeverity", "requiresAlert", "reasoning"]
        }
      }
    });
  });

  // 4. FORMAT OUTPUT
  let brainOutput: any = {};
  try {
     brainOutput = JSON.parse(cleanJson(correlationResp.text));
  } catch (e) {
     brainOutput = { summary: "Analysis failed", globalSeverity: Severity.LOW, requiresAlert: false, reasoning: "JSON Error" };
  }

  const report = { 
    findings, 
    agentType, 
    target: input, 
    ...brainOutput,
    // Inject Calculated Metrics
    healthScore: riskMetrics.healthScore,
    weightedRiskScore: riskMetrics.weightedRiskScore,
    compoundThreat: riskMetrics.compoundThreat
  };

  const alert = brainOutput.requiresAlert 
    ? { 
        severity: brainOutput.globalSeverity, 
        summary: brainOutput.summary, 
        description: brainOutput.reasoning, 
        status: 'pending_approval' 
      } 
    : null;

  return { report, alert };
}

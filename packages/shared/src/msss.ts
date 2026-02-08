// Percival Labs - MCP Server Security Standard (MSSS) Type Definitions
// Based on the MSSS specification (Jan 15, 2026)

export interface MsssControl {
  id: string;
  domain: string;
  level: number;
  title: string;
  description: string;
  verification: 'automated' | 'manual' | 'hybrid';
}

export interface MsssAssessment {
  server_id: string;
  level: number;
  controls_passed: number;
  controls_total: number;
  domains: Record<string, { passed: number; total: number }>;
  assessed_at: string;
  expires_at: string;
}

// MSSS has 4 compliance levels
export const MSSS_LEVELS = {
  1: { name: 'Basic', description: 'Minimum security requirements', controls: 6 },
  2: { name: 'Standard', description: 'Production-ready security', controls: 12 },
  3: { name: 'Enhanced', description: 'Enterprise security posture', controls: 18 },
  4: { name: 'Critical', description: 'Maximum security assurance', controls: 24 },
} as const;

// 8 security domains
export const MSSS_DOMAINS = {
  authentication: 'Authentication & Authorization',
  transport: 'Transport Security',
  input: 'Input Validation',
  output: 'Output Sanitization',
  logging: 'Logging & Monitoring',
  secrets: 'Secrets Management',
  dependencies: 'Dependency Security',
  runtime: 'Runtime Isolation',
} as const;

// Control catalog (Level 1 — Basic)
export const MSSS_CONTROLS: MsssControl[] = [
  // Authentication
  { id: 'AUTH-01', domain: 'authentication', level: 1, title: 'API key authentication', description: 'Server requires valid API key for all requests', verification: 'automated' },
  { id: 'AUTH-02', domain: 'authentication', level: 2, title: 'OAuth2/OIDC support', description: 'Server supports standard OAuth2 flows', verification: 'automated' },
  { id: 'AUTH-03', domain: 'authentication', level: 3, title: 'Mutual TLS', description: 'Server supports mTLS for client authentication', verification: 'automated' },

  // Transport
  { id: 'TRANS-01', domain: 'transport', level: 1, title: 'TLS encryption', description: 'All communications encrypted with TLS 1.2+', verification: 'automated' },
  { id: 'TRANS-02', domain: 'transport', level: 2, title: 'Certificate pinning', description: 'Server pins to specific CA certificates', verification: 'automated' },
  { id: 'TRANS-03', domain: 'transport', level: 3, title: 'Forward secrecy', description: 'Cipher suites support perfect forward secrecy', verification: 'automated' },

  // Input validation
  { id: 'INPUT-01', domain: 'input', level: 1, title: 'Schema validation', description: 'All tool inputs validated against JSON Schema', verification: 'automated' },
  { id: 'INPUT-02', domain: 'input', level: 2, title: 'Injection prevention', description: 'Inputs sanitized against injection attacks', verification: 'hybrid' },
  { id: 'INPUT-03', domain: 'input', level: 3, title: 'Rate limiting', description: 'Per-client rate limits enforced', verification: 'automated' },

  // Output
  { id: 'OUT-01', domain: 'output', level: 1, title: 'Output sanitization', description: 'Tool outputs sanitized before return', verification: 'automated' },
  { id: 'OUT-02', domain: 'output', level: 2, title: 'Content type enforcement', description: 'Response content types strictly enforced', verification: 'automated' },
  { id: 'OUT-03', domain: 'output', level: 3, title: 'Data classification', description: 'Outputs tagged with sensitivity levels', verification: 'manual' },

  // Logging
  { id: 'LOG-01', domain: 'logging', level: 1, title: 'Access logging', description: 'All tool invocations logged with timestamps', verification: 'automated' },
  { id: 'LOG-02', domain: 'logging', level: 2, title: 'Audit trail', description: 'Immutable audit trail for security events', verification: 'hybrid' },
  { id: 'LOG-03', domain: 'logging', level: 3, title: 'Real-time alerting', description: 'Security events trigger real-time alerts', verification: 'manual' },

  // Secrets
  { id: 'SEC-01', domain: 'secrets', level: 1, title: 'No hardcoded secrets', description: 'No secrets in source code or configuration', verification: 'automated' },
  { id: 'SEC-02', domain: 'secrets', level: 2, title: 'Environment variable isolation', description: 'Secrets loaded from environment only', verification: 'automated' },
  { id: 'SEC-03', domain: 'secrets', level: 3, title: 'Secret rotation', description: 'Automated credential rotation support', verification: 'manual' },

  // Dependencies
  { id: 'DEP-01', domain: 'dependencies', level: 1, title: 'No known vulnerabilities', description: 'Dependencies free of known CVEs', verification: 'automated' },
  { id: 'DEP-02', domain: 'dependencies', level: 2, title: 'Lockfile integrity', description: 'Dependency lockfile verified and complete', verification: 'automated' },
  { id: 'DEP-03', domain: 'dependencies', level: 3, title: 'Supply chain verification', description: 'All deps verified against signed checksums', verification: 'hybrid' },

  // Runtime
  { id: 'RT-01', domain: 'runtime', level: 1, title: 'Process isolation', description: 'Server runs in isolated process/container', verification: 'automated' },
  { id: 'RT-02', domain: 'runtime', level: 2, title: 'Resource limits', description: 'CPU, memory, and network limits enforced', verification: 'automated' },
  { id: 'RT-03', domain: 'runtime', level: 3, title: 'Syscall filtering', description: 'Restricted syscall profile (seccomp/AppArmor)', verification: 'hybrid' },
];

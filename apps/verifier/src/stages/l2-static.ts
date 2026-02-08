// Percival Labs - L2 Static Analysis
// Async analysis: pattern detection, dependency scanning, capability drift, secret detection

export interface L2Result {
  stage: 'static';
  status: 'pass' | 'fail' | 'escalate';
  results: {
    level: 'L2';
    findings: L2Finding[];
    risk_score: number; // 0-100, higher = more risk
    duration_ms: number;
    summary: string;
  };
}

export interface L2Finding {
  id: string;
  category: 'security' | 'quality' | 'capability' | 'dependency' | 'secret';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location?: string; // line reference or section
  remediation?: string;
}

// Suspicious patterns with severity levels
const SECURITY_PATTERNS: Array<{
  pattern: RegExp;
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation: string;
}> = [
  // Critical — code execution
  {
    pattern: /\beval\s*\(/g,
    id: 'SEC-EVAL',
    title: 'eval() detected',
    severity: 'critical',
    description: 'eval() allows arbitrary code execution and is a primary injection vector',
    remediation: 'Replace eval() with safe alternatives (JSON.parse for data, specific parsers for expressions)',
  },
  {
    pattern: /\bnew\s+Function\s*\(/g,
    id: 'SEC-FUNC-CTOR',
    title: 'Function constructor detected',
    severity: 'critical',
    description: 'new Function() is equivalent to eval() and allows arbitrary code execution',
    remediation: 'Use named functions or arrow functions instead',
  },
  {
    pattern: /\bcurl\s+.*\|\s*(?:bash|sh|zsh)\b/g,
    id: 'SEC-CURL-PIPE',
    title: 'Piped curl to shell',
    severity: 'critical',
    description: 'Downloading and executing remote code is a supply chain attack vector',
    remediation: 'Download files, verify checksums, then execute separately',
  },
  {
    pattern: /\brm\s+-rf\s+[/~$]/g,
    id: 'SEC-RM-RF',
    title: 'Dangerous rm -rf',
    severity: 'critical',
    description: 'Destructive removal of root/home/variable paths',
    remediation: 'Use explicit, bounded paths for file removal',
  },
  {
    pattern: /\bchmod\s+777\b/g,
    id: 'SEC-CHMOD-777',
    title: 'chmod 777 detected',
    severity: 'high',
    description: 'World-writable permissions are a security risk',
    remediation: 'Use minimum necessary permissions (e.g., 755 for executables, 644 for files)',
  },

  // High — process execution
  {
    pattern: /\bexec(?:Sync)?\s*\(/g,
    id: 'SEC-EXEC',
    title: 'exec/execSync detected',
    severity: 'high',
    description: 'Shell command execution without declared process capability',
    remediation: 'Declare process capability in manifest, or use safer alternatives',
  },
  {
    pattern: /\bspawn(?:Sync)?\s*\(/g,
    id: 'SEC-SPAWN',
    title: 'spawn/spawnSync detected',
    severity: 'high',
    description: 'Process spawning without declared process capability',
    remediation: 'Declare process capability with specific allowed commands',
  },
  {
    pattern: /\bchild_process\b/g,
    id: 'SEC-CHILD-PROC',
    title: 'child_process module reference',
    severity: 'high',
    description: 'Direct use of child_process module bypasses capability controls',
    remediation: 'Declare process capability and use approved execution patterns',
  },

  // Medium — data access
  {
    pattern: /\bprocess\.env\b/g,
    id: 'SEC-PROC-ENV',
    title: 'process.env access',
    severity: 'medium',
    description: 'Environment variable access may expose secrets',
    remediation: 'Document which env vars are accessed and why',
  },
  {
    pattern: /\bfs\.\s*(?:writeFile|unlink|rmdir|rm|rename)\b/g,
    id: 'SEC-FS-WRITE',
    title: 'Destructive filesystem operations',
    severity: 'medium',
    description: 'File modification/deletion detected',
    remediation: 'Declare filesystem write capability with specific paths',
  },
  {
    pattern: /\bfetch\s*\(/g,
    id: 'SEC-NETWORK',
    title: 'Network fetch detected',
    severity: 'low',
    description: 'Outbound network requests detected',
    remediation: 'Declare network capability with specific domains',
  },
];

// Secret detection patterns
const SECRET_PATTERNS: Array<{
  pattern: RegExp;
  id: string;
  title: string;
}> = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, id: 'SEC-API-KEY', title: 'Hardcoded API key' },
  { pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, id: 'SEC-SECRET', title: 'Hardcoded secret/password' },
  { pattern: /(?:token)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, id: 'SEC-TOKEN', title: 'Hardcoded token' },
  { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, id: 'SEC-PRIV-KEY', title: 'Private key embedded' },
  { pattern: /AKIA[0-9A-Z]{16}/g, id: 'SEC-AWS-KEY', title: 'AWS access key' },
  { pattern: /sk-[a-zA-Z0-9]{32,}/g, id: 'SEC-OPENAI-KEY', title: 'OpenAI/Anthropic API key' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, id: 'SEC-GITHUB-TOKEN', title: 'GitHub personal access token' },
];

// Known malicious/risky npm packages
const RISKY_PACKAGES = new Set([
  'event-stream', 'flatmap-stream', 'ua-parser-js',
  'coa', 'rc', 'colors', 'faker',
  'node-ipc', 'peacenotwar',
]);

export function runL2StaticAnalysis(
  content: string,
  manifest?: Record<string, unknown>,
  readme?: string,
): L2Result {
  const start = performance.now();
  const findings: L2Finding[] = [];

  // ── Security Pattern Scan ──
  for (const sp of SECURITY_PATTERNS) {
    sp.pattern.lastIndex = 0;
    const matches = content.match(sp.pattern);
    if (matches) {
      // Check if capability is declared
      const declaredCaps = manifest?.capabilities as Record<string, unknown> | undefined;
      let isDeclared = false;

      if (declaredCaps) {
        if (sp.id.includes('EXEC') || sp.id.includes('SPAWN') || sp.id.includes('CHILD')) {
          isDeclared = 'process' in declaredCaps;
        }
        if (sp.id.includes('FS')) {
          isDeclared = 'filesystem' in declaredCaps;
        }
        if (sp.id.includes('NETWORK')) {
          isDeclared = 'network' in declaredCaps;
        }
      }

      // Downgrade severity if capability is declared
      const effectiveSeverity = isDeclared && sp.severity !== 'critical'
        ? downgrade(sp.severity)
        : sp.severity;

      findings.push({
        id: sp.id,
        category: 'security',
        severity: effectiveSeverity,
        title: sp.title,
        description: `${sp.description}. Found ${matches.length} occurrence(s).${isDeclared ? ' (capability declared)' : ''}`,
        remediation: sp.remediation,
      });
    }
  }

  // ── Secret Detection ──
  for (const sp of SECRET_PATTERNS) {
    sp.pattern.lastIndex = 0;
    const matches = content.match(sp.pattern);
    if (matches) {
      findings.push({
        id: sp.id,
        category: 'secret',
        severity: 'critical',
        title: sp.title,
        description: `${matches.length} potential secret(s) found in skill content`,
        remediation: 'Remove hardcoded secrets. Use environment variables or a secrets manager.',
      });
    }
  }

  // ── Capability Drift Detection ──
  if (manifest) {
    const declaredCaps = manifest.capabilities as Record<string, unknown> | undefined;
    const detected = detectCapabilities(content);

    for (const cap of detected) {
      const isDeclared = declaredCaps && cap in declaredCaps;
      if (!isDeclared) {
        findings.push({
          id: `CAP-DRIFT-${cap.toUpperCase()}`,
          category: 'capability',
          severity: 'high',
          title: `Undeclared capability: ${cap}`,
          description: `Code uses ${cap} capabilities but manifest does not declare them`,
          remediation: `Add "${cap}" to manifest capabilities, or remove the functionality`,
        });
      }
    }
  }

  // ── Dependency Scan ──
  if (manifest?.dependencies) {
    const deps = manifest.dependencies as Record<string, string>;
    for (const [pkg] of Object.entries(deps)) {
      if (RISKY_PACKAGES.has(pkg)) {
        findings.push({
          id: `DEP-RISKY-${pkg.toUpperCase().replace(/[^A-Z]/g, '_')}`,
          category: 'dependency',
          severity: 'high',
          title: `Risky dependency: ${pkg}`,
          description: `${pkg} has a known history of supply chain attacks or malicious behavior`,
          remediation: `Remove ${pkg} and use a safer alternative`,
        });
      }
    }
  }

  // ── Quality Checks ──
  if (readme) {
    if (readme.length < 100) {
      findings.push({
        id: 'QUAL-README-SHORT',
        category: 'quality',
        severity: 'low',
        title: 'README is very short',
        description: 'README has less than 100 characters. Users need more documentation.',
        remediation: 'Add usage instructions, examples, and capability descriptions',
      });
    }

    if (!readme.includes('##') && readme.length > 200) {
      findings.push({
        id: 'QUAL-README-STRUCTURE',
        category: 'quality',
        severity: 'info',
        title: 'README lacks structure',
        description: 'README is long but has no headings',
        remediation: 'Add markdown headings to organize content',
      });
    }
  }

  // ── Content size check ──
  if (content.length > 500000) {
    findings.push({
      id: 'QUAL-SIZE',
      category: 'quality',
      severity: 'medium',
      title: 'Skill content is very large',
      description: `Content is ${Math.round(content.length / 1000)}KB. Large skills are harder to audit.`,
      remediation: 'Consider splitting into smaller, focused skills',
    });
  }

  // ── Calculate risk score ──
  const risk_score = calculateRiskScore(findings);

  // Determine status
  const hasCritical = findings.some(f => f.severity === 'critical');
  const highCount = findings.filter(f => f.severity === 'high').length;
  let status: 'pass' | 'fail' | 'escalate';

  if (hasCritical) {
    status = 'fail';
  } else if (highCount >= 3) {
    status = 'escalate';
  } else {
    status = 'pass';
  }

  const critCount = findings.filter(f => f.severity === 'critical').length;
  const summary = [
    `${findings.length} findings`,
    critCount > 0 ? `${critCount} critical` : null,
    highCount > 0 ? `${highCount} high` : null,
    `risk score: ${risk_score}/100`,
  ].filter(Boolean).join(', ');

  return {
    stage: 'static',
    status,
    results: {
      level: 'L2',
      findings,
      risk_score,
      duration_ms: Math.round(performance.now() - start),
      summary,
    },
  };
}

function detectCapabilities(content: string): string[] {
  const caps: string[] = [];

  // Network
  if (/\b(?:fetch|http|https|XMLHttpRequest|axios|got)\s*\(/.test(content)) {
    caps.push('network');
  }

  // Filesystem
  if (/\b(?:readFile|writeFile|readdir|mkdir|unlink|stat|access|open)\s*\(/.test(content) ||
      /\bfs\.\w+/.test(content) || /\bBun\.file\b/.test(content)) {
    caps.push('filesystem');
  }

  // Process
  if (/\b(?:exec|spawn|fork|execFile|child_process)\b/.test(content) ||
      /\bBun\.spawn\b/.test(content)) {
    caps.push('process');
  }

  // LLM
  if (/\b(?:anthropic|openai|claude|gpt|llm|chat\.completions)\b/i.test(content)) {
    caps.push('llm');
  }

  // Crypto
  if (/\b(?:crypto\.create|sign|verify|encrypt|decrypt|hash)\b/.test(content)) {
    caps.push('crypto');
  }

  return caps;
}

function calculateRiskScore(findings: L2Finding[]): number {
  let score = 0;
  for (const f of findings) {
    switch (f.severity) {
      case 'critical': score += 25; break;
      case 'high': score += 15; break;
      case 'medium': score += 5; break;
      case 'low': score += 2; break;
      case 'info': break;
    }
  }
  return Math.min(100, score);
}

function downgrade(severity: 'critical' | 'high' | 'medium' | 'low'): 'critical' | 'high' | 'medium' | 'low' {
  switch (severity) {
    case 'high': return 'medium';
    case 'medium': return 'low';
    default: return severity;
  }
}

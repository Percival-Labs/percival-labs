// Percival Labs - CLI Install Command
// Fetch skill details from registry and display installation info

const REGISTRY_URL = process.env.PERCIVAL_REGISTRY || 'http://localhost:3100';

// ANSI color helpers
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

function trustBadge(score: number): string {
  if (score >= 80) return green(`[TRUSTED ${score}]`);
  if (score >= 50) return yellow(`[MODERATE ${score}]`);
  if (score >= 25) return red(`[LOW ${score}]`);
  return red(`[UNTRUSTED ${score}]`);
}

export async function install(slug: string): Promise<void> {
  if (!slug.trim()) {
    console.error(red('Error: Skill slug is required.'));
    console.error(dim('Usage: percival install <slug>'));
    process.exit(1);
  }

  const url = `${REGISTRY_URL}/v1/skills/${encodeURIComponent(slug)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.error('');
        console.error(red(`  Skill "${slug}" not found in the registry.`));
        console.error(dim('  Try: ') + bold('percival search <query>') + dim(' to find skills.'));
        console.error('');
        return;
      }
      throw new Error(`Registry returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as {
      skill: {
        name: string;
        slug: string;
        category: string;
        description: string;
        publisher: {
          display_name: string;
          verified_at: string | null;
          trust_score: number;
        };
      };
      versions: Array<{
        semver: string;
        audit_status: string;
        created_at: string;
      }>;
      trust: {
        overall: number;
        dimensions: {
          publisher: number;
          security: number;
          quality: number;
          usage: number;
          community: number;
        };
      };
      capabilities: Array<{
        type: string;
        resource: string;
        required: boolean;
      }>;
    };

    const { skill, versions, trust, capabilities } = data;
    const latestVersion = versions[0];

    // Skill details
    console.log('');
    console.log(`  ${bold(cyan(skill.name))} ${trustBadge(trust.overall)}`);
    console.log(`  ${dim(skill.description)}`);
    console.log('');
    console.log(`  ${dim('Publisher:')}  ${skill.publisher.display_name}${skill.publisher.verified_at ? green(' (verified)') : yellow(' (unverified)')}`);
    console.log(`  ${dim('Category:')}  ${skill.category}`);
    console.log(`  ${dim('Slug:')}      ${skill.slug}`);

    if (latestVersion) {
      const auditIcon = latestVersion.audit_status === 'pass' ? green('PASS') : red(latestVersion.audit_status.toUpperCase());
      console.log(`  ${dim('Version:')}   ${latestVersion.semver} ${dim('|')} Audit: ${auditIcon} ${dim('|')} ${dim(latestVersion.created_at)}`);
    }

    // Trust breakdown
    console.log('');
    console.log(`  ${bold('Trust Score Breakdown:')}`);
    console.log(`    Publisher:  ${formatBar(trust.dimensions.publisher)}`);
    console.log(`    Security:  ${formatBar(trust.dimensions.security)}`);
    console.log(`    Quality:   ${formatBar(trust.dimensions.quality)}`);
    console.log(`    Usage:     ${formatBar(trust.dimensions.usage)}`);
    console.log(`    Community: ${formatBar(trust.dimensions.community)}`);

    // Capabilities
    if (capabilities.length > 0) {
      console.log('');
      console.log(`  ${bold('Declared Capabilities:')}`);
      for (const cap of capabilities) {
        const reqLabel = cap.required ? red('required') : dim('optional');
        console.log(`    ${yellow(cap.type)} ${dim(':')} ${cap.resource} ${dim(`(${reqLabel})`)}`);
      }
    }

    // Install prompt
    console.log('');
    console.log(`  ${dim('Install to')} ~/.claude/skills/${skill.name}/ ${dim('? (not yet implemented)')}`);
    console.log('');

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('ECONNREFUSED') || message.includes('fetch failed') || message.includes('Unable to connect')) {
      console.error('');
      console.error(red('  Registry unreachable at ') + cyan(REGISTRY_URL));
      console.error(dim('  Start the registry: ') + bold('bun run dev'));
      console.error('');
    } else {
      console.error(red(`Error: ${message}`));
    }
    process.exit(1);
  }
}

function formatBar(score: number): string {
  const max = 20;
  const filled = Math.round((score / 100) * max);
  const empty = max - filled;

  let color: (s: string) => string;
  if (score >= 70) color = green;
  else if (score >= 40) color = yellow;
  else color = red;

  return color('\u2588'.repeat(filled)) + dim('\u2591'.repeat(empty)) + ` ${score}`;
}

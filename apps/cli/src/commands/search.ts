// Percival Labs - CLI Search Command
// HTTP GET to registry, display results as formatted table

const REGISTRY_URL = process.env.PERCIVAL_REGISTRY || 'http://localhost:3100';

// ANSI color helpers
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

function trustColor(score: number): string {
  if (score >= 70) return green(String(score));
  if (score >= 40) return yellow(String(score));
  return red(String(score));
}

function pad(str: string, len: number): string {
  // Strip ANSI for length calculation
  const plain = str.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = Math.max(0, len - plain.length);
  return str + ' '.repeat(padding);
}

export async function search(query: string): Promise<void> {
  if (!query.trim()) {
    console.error(red('Error: Search query is required.'));
    console.error(dim('Usage: percival search <query>'));
    process.exit(1);
  }

  const url = `${REGISTRY_URL}/v1/skills?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(dim('No registry found at ') + cyan(REGISTRY_URL));
        console.log(dim('Is the registry running? Try: ') + bold('bun run dev'));
        return;
      }
      throw new Error(`Registry returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as {
      skills: Array<{
        name: string;
        slug: string;
        category: string;
        trust_score: number;
        latest_version: string | null;
        publisher_name: string;
      }>;
      total: number;
    };

    if (!data.skills || data.skills.length === 0) {
      console.log('');
      console.log(dim(`  No skills found matching "${query}"`));
      console.log(dim('  Try a broader search term.'));
      console.log('');
      return;
    }

    // Table header
    console.log('');
    console.log(bold(`  Found ${data.total} skill${data.total === 1 ? '' : 's'} matching "${query}":`));
    console.log('');
    console.log(
      `  ${pad(bold('Name'), 28)} ${pad(bold('Category'), 18)} ${pad(bold('Trust'), 10)} ${pad(bold('Version'), 12)} ${bold('Publisher')}`
    );
    console.log(`  ${dim('-'.repeat(80))}`);

    // Table rows
    for (const skill of data.skills) {
      const name = cyan(skill.name);
      const category = skill.category;
      const trust = trustColor(skill.trust_score);
      const version = skill.latest_version || dim('n/a');
      const publisher = dim(skill.publisher_name);

      console.log(
        `  ${pad(name, 28)} ${pad(category, 18)} ${pad(trust, 10)} ${pad(version, 12)} ${publisher}`
      );
    }

    console.log('');
    if (data.total > data.skills.length) {
      console.log(dim(`  Showing ${data.skills.length} of ${data.total} results.`));
      console.log('');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('ECONNREFUSED') || message.includes('fetch failed') || message.includes('Unable to connect')) {
      console.error('');
      console.error(red('  Registry unreachable at ') + cyan(REGISTRY_URL));
      console.error(dim('  Start the registry: ') + bold('bun run dev'));
      console.error(dim('  Or set PERCIVAL_REGISTRY env var to a custom URL.'));
      console.error('');
    } else {
      console.error(red(`Error: ${message}`));
    }
    process.exit(1);
  }
}

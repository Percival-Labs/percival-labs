// Percival Labs - CLI Publish Command
// Parse SKILL.md from current directory and display results

import { parseSkillMd } from '@percival/shared';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ANSI color helpers
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

export async function publish(): Promise<void> {
  const cwd = process.cwd();
  const skillMdPath = join(cwd, 'SKILL.md');

  if (!existsSync(skillMdPath)) {
    console.error('');
    console.error(red('  No SKILL.md found in current directory.'));
    console.error(dim(`  Looked in: ${cwd}`));
    console.error('');
    console.error(dim('  Create a SKILL.md with YAML frontmatter:'));
    console.error('');
    console.error(dim('    ---'));
    console.error(dim('    name: MySkill'));
    console.error(dim('    description: What it does. USE WHEN trigger1, trigger2.'));
    console.error(dim('    context: fork'));
    console.error(dim('    ---'));
    console.error(dim('    # MySkill'));
    console.error(dim('    Markdown body...'));
    console.error('');
    process.exit(1);
  }

  try {
    const content = readFileSync(skillMdPath, 'utf-8');
    const parsed = parseSkillMd(content);

    console.log('');
    console.log(`  ${bold(cyan('Parsed SKILL.md'))}`);
    console.log(`  ${dim('-'.repeat(50))}`);
    console.log('');
    console.log(`  ${dim('Name:')}        ${bold(parsed.name)}`);
    console.log(`  ${dim('Description:')} ${parsed.description.slice(0, 120)}${parsed.description.length > 120 ? '...' : ''}`);
    console.log(`  ${dim('Context:')}     ${parsed.context}`);
    console.log(`  ${dim('Category:')}    ${parsed.category}`);

    if (parsed.triggers.length > 0) {
      console.log(`  ${dim('Triggers:')}    ${parsed.triggers.map(t => cyan(t)).join(', ')}`);
    }

    if (parsed.workflows.length > 0) {
      console.log('');
      console.log(`  ${bold('Workflows:')}`);
      for (const wf of parsed.workflows) {
        console.log(`    ${green(wf.name)} ${dim('->')} ${wf.file} ${dim(`(${wf.trigger})`)}`);
      }
    }

    if (parsed.toolReferences.length > 0) {
      console.log('');
      console.log(`  ${dim('Tool References:')} ${parsed.toolReferences.map(t => yellow(t)).join(', ')}`);
    }

    console.log('');
    console.log(`  ${dim('Body:')} ${parsed.body.length} characters`);
    console.log('');
    console.log(`  ${yellow('Publishing workflow not yet connected')}`);
    console.log('');

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(red(`Error parsing SKILL.md: ${message}`));
    process.exit(1);
  }
}

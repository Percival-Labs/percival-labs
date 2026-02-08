#!/usr/bin/env bun
// Percival Labs - CLI Client
// Registry interaction from the command line

import { search } from './commands/search';
import { install } from './commands/install';
import { publish } from './commands/publish';
import { verify } from './commands/verify';

// ANSI color helpers
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

function showHelp(): void {
  console.log('');
  console.log(`  ${bold(cyan('percival'))} ${dim('- Skill Registry CLI')}`);
  console.log('');
  console.log(`  ${bold('USAGE')}`);
  console.log(`    ${cyan('percival')} ${dim('<command>')} ${dim('[args]')}`);
  console.log('');
  console.log(`  ${bold('COMMANDS')}`);
  console.log(`    ${cyan('search')} ${dim('<query>')}      Search the skill registry`);
  console.log(`    ${cyan('install')} ${dim('<slug>')}      View skill details and install info`);
  console.log(`    ${cyan('publish')}              Parse SKILL.md in current directory`);
  console.log(`    ${cyan('verify')} ${dim('<path>')}       Validate a SKILL.md file`);
  console.log(`    ${cyan('help')}                 Show this help message`);
  console.log('');
  console.log(`  ${bold('EXAMPLES')}`);
  console.log(`    ${dim('$')} percival search "content generation"`);
  console.log(`    ${dim('$')} percival install content-machine`);
  console.log(`    ${dim('$')} percival publish`);
  console.log(`    ${dim('$')} percival verify ./SKILL.md`);
  console.log('');
  console.log(`  ${bold('ENVIRONMENT')}`);
  console.log(`    ${yellow('PERCIVAL_REGISTRY')}    Registry URL ${dim('(default: http://localhost:3100)')}`);
  console.log('');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  switch (command) {
    case 'search': {
      const query = args.slice(1).join(' ');
      await search(query);
      break;
    }

    case 'install': {
      const slug = args[1] || '';
      await install(slug);
      break;
    }

    case 'publish': {
      await publish();
      break;
    }

    case 'verify': {
      const path = args[1] || '';
      await verify(path);
      break;
    }

    default: {
      console.error(`\x1b[31mUnknown command: ${command}\x1b[0m`);
      console.error(dim('Run "percival help" for usage information.'));
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(`\x1b[31mFatal error: ${err instanceof Error ? err.message : String(err)}\x1b[0m`);
  process.exit(1);
});

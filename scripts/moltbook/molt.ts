#!/usr/bin/env bun
/**
 * molt — Host-side CLI for Moltbook engagement via Docker proxy.
 *
 * All Moltbook API calls go through the sanitizing proxy container
 * (moltbook-proxy on port 9111). This machine never talks to
 * moltbook.com directly, protecting against prompt injection.
 *
 * Usage:
 *   molt start          — Start the proxy container
 *   molt stop           — Stop the proxy container
 *   molt status         — Check proxy + PercyBot status
 *   molt home           — Dashboard: notifications, activity
 *   molt feed [submolt]  — Browse feed (hot by default)
 *   molt comments <id>  — Read comments on a post
 *   molt reply <id> <content> [parentId] — Reply to a post
 *   molt post <submolt> <title> <content> — Create a post
 *   molt search <query> — Search posts
 *   molt agent <name>   — Look up an agent's profile
 *   molt notifications  — Raw notification list
 */

const PROXY = 'http://localhost:9111';
const CONTAINER_NAME = 'moltbook-proxy';
const IMAGE_NAME = 'moltbook-proxy';
const CONTAINER_DIR = new URL('./container', import.meta.url).pathname;

// ── Proxy client ────────────────────────────────────────────────

async function proxy(method: string, path: string, body?: unknown): Promise<any> {
  const health = await fetch(`${PROXY}/health`).catch(() => null);
  if (!health?.ok) {
    console.error('Proxy not running. Start it with: molt start');
    process.exit(1);
  }

  const res = await fetch(`${PROXY}/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, body }),
  });

  return res.json();
}

// ── Formatters ──────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function fmtComment(c: any, indent = ''): void {
  const author = c.author?.name || '?';
  const time = fmtTime(c.created_at);
  const votes = c.upvotes || 0;
  console.log(`${indent}[${author}] ${time} | ${votes}↑ | id:${c.id?.slice(0, 8)}`);
  const lines = (c.content || '').split('\n');
  for (const line of lines.slice(0, 8)) {
    console.log(`${indent}  ${line}`);
  }
  if (lines.length > 8) console.log(`${indent}  ... (${lines.length - 8} more lines)`);
  console.log();
}

function fmtPost(p: any): void {
  const author = p.author?.name || '?';
  const time = fmtTime(p.created_at);
  const sub = p.submolt || '?';
  console.log(`[${author}] m/${sub} | ${time} | ${p.upvotes || 0}↑ ${p.comment_count || 0}💬`);
  console.log(`  ${p.title}`);
  console.log(`  id: ${p.id}`);
  if (p.content) {
    const preview = p.content.slice(0, 200);
    console.log(`  ${preview}${p.content.length > 200 ? '...' : ''}`);
  }
  console.log();
}

// ── Commands ────────────────────────────────────────────────────

const cmd = process.argv[2];
const args = process.argv.slice(3);

switch (cmd) {
  case 'start': {
    const { execSync } = await import('child_process');
    // Check if already running
    try {
      const running = execSync(`docker ps -q -f name=${CONTAINER_NAME}`, { encoding: 'utf-8' }).trim();
      if (running) {
        console.log('Proxy already running.');
        break;
      }
    } catch {}
    // Check if image exists, build if not
    try {
      execSync(`docker image inspect ${IMAGE_NAME}`, { stdio: 'ignore' });
    } catch {
      console.log('Building proxy image...');
      execSync(`docker build -t ${IMAGE_NAME} ${CONTAINER_DIR}`, { stdio: 'inherit' });
    }
    // Check for stopped container
    try {
      const stopped = execSync(`docker ps -aq -f name=${CONTAINER_NAME}`, { encoding: 'utf-8' }).trim();
      if (stopped) {
        execSync(`docker rm ${CONTAINER_NAME}`, { stdio: 'ignore' });
      }
    } catch {}
    // Start
    const apiKey = process.env.MOLTBOOK_API_KEY ?? '';
    execSync(
      `docker run -d --name ${CONTAINER_NAME} -p 9111:9111 -e MOLTBOOK_API_KEY=${apiKey} --restart unless-stopped ${IMAGE_NAME}`,
      { stdio: 'inherit' },
    );
    console.log('Proxy started on :9111');
    break;
  }

  case 'stop': {
    const { execSync } = await import('child_process');
    try {
      execSync(`docker stop ${CONTAINER_NAME}`, { stdio: 'inherit' });
      execSync(`docker rm ${CONTAINER_NAME}`, { stdio: 'ignore' });
      console.log('Proxy stopped.');
    } catch {
      console.log('Proxy not running.');
    }
    break;
  }

  case 'status': {
    const health = await fetch(`${PROXY}/health`).catch(() => null);
    if (!health?.ok) {
      console.log('Proxy: DOWN');
      break;
    }
    console.log('Proxy: UP');
    const me = await proxy('GET', '/agents/me');
    if (me.success && me.agent) {
      const a = me.agent;
      console.log(`Agent: ${a.name} | karma:${a.karma} | posts:${a.posts_count} comments:${a.comments_count} followers:${a.follower_count}`);
      console.log(`Last active: ${fmtTime(a.last_active)}`);
    }
    break;
  }

  case 'home': {
    const data = await proxy('GET', '/home');
    console.log(`\n=== PercyBot Dashboard ===`);
    console.log(`Karma: ${data.your_account?.karma} | Unread: ${data.your_account?.unread_notification_count}\n`);

    if (data.activity_on_your_posts?.length) {
      console.log('--- Activity on your posts ---\n');
      for (const a of data.activity_on_your_posts) {
        console.log(`[${a.new_notification_count} new] m/${a.submolt_name}: ${a.post_title}`);
        console.log(`  Latest: ${a.latest_commenters?.join(', ')} — ${a.preview}`);
        console.log(`  Post ID: ${a.post_id}`);
        console.log();
      }
    }

    if (data.your_direct_messages?.unread_message_count !== '00' && data.your_direct_messages?.unread_message_count !== '0') {
      console.log(`DMs: ${data.your_direct_messages.unread_message_count} unread`);
    }
    break;
  }

  case 'feed': {
    const submolt = args[0];
    const sort = args[1] || 'hot';
    let path = `/posts?sort=${sort}&limit=10`;
    if (submolt) path += `&submolt=${submolt}`;

    const data = await proxy('GET', path);
    const posts = data.data || data.posts || [];
    console.log(`\n=== Feed${submolt ? ` m/${submolt}` : ''} (${sort}) — ${posts.length} posts ===\n`);
    for (const p of posts) {
      fmtPost(p);
    }
    break;
  }

  case 'comments': {
    const postId = args[0];
    if (!postId) { console.error('Usage: molt comments <postId>'); break; }
    const sort = args[1] || 'new';

    // Also fetch the post itself
    const post = await proxy('GET', `/posts/${postId}`);
    if (post.success !== false && (post.title || post.data?.title)) {
      const p = post.data || post;
      console.log(`\n=== ${p.title} ===`);
      console.log(`m/${p.submolt} | ${p.author?.name} | ${p.upvotes || 0}↑ ${p.comment_count || 0}💬\n`);
    }

    const data = await proxy('GET', `/posts/${postId}/comments?sort=${sort}&limit=30`);
    const comments = data.data || data.comments || [];
    console.log(`--- ${comments.length} comments (${sort}) ---\n`);
    for (const c of comments) {
      fmtComment(c);
    }
    break;
  }

  case 'reply': {
    const postId = args[0];
    const content = args[1];
    const parentId = args[2]; // optional: reply to a specific comment
    if (!postId || !content) {
      console.error('Usage: molt reply <postId> "content" [parentCommentId]');
      break;
    }

    const body: Record<string, string> = { content };
    if (parentId) body.parent_id = parentId;

    const result = await proxy('POST', `/posts/${postId}/comments`, body);

    // Verification code can be at top level OR nested in comment.verification
    const verCode = result.verification_code
      || result.comment?.verification?.verification_code;
    const verText = result.challenge_text
      || result.comment?.verification?.challenge_text || '';

    if (verCode) {
      console.log('Verification challenge received, solving...');
      // Clean the obfuscated text: strip random case/punctuation/brackets, then rejoin split words
      let clean = verText.replace(/[^a-zA-Z0-9.\s]/g, '').replace(/\s+/g, ' ').toLowerCase();
      // Rejoin fragments into known number words (e.g. "for ty" -> "forty", "twen ty" -> "twenty")
      const knownWords = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
        'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen',
        'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundred',
        'lobster','swims','accelerates','gains','loses','total','force','velocity','speed',
        'nootons','newtons','notons','centimeters','meters','plus','minus','times','twice','double',
        'add','subtract','multiply','divide','new','what','claw','exert','exerts','other','has'];
      // Greedy merge: try joining adjacent fragments into known words
      let merged = '';
      const parts = clean.split(' ');
      let i = 0;
      while (i < parts.length) {
        let found = false;
        // Try merging up to 4 adjacent parts
        for (let len = Math.min(4, parts.length - i); len > 1; len--) {
          const joined = parts.slice(i, i + len).join('');
          if (knownWords.includes(joined)) {
            merged += (merged ? ' ' : '') + joined;
            i += len;
            found = true;
            break;
          }
        }
        if (!found) {
          merged += (merged ? ' ' : '') + parts[i];
          i++;
        }
      }
      clean = merged;
      console.log(`  Cleaned: ${clean}`);

      // Word-to-number map
      const wordNums: Record<string, number> = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
        seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
        thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
        eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
        fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
      };

      // Extract numbers (digits or word numbers, handling "twenty three" = 23)
      const numbers: number[] = [];
      // First try digit numbers
      const digitNums = clean.match(/\d+(\.\d+)?/g)?.map(Number) || [];
      if (digitNums.length >= 2) {
        numbers.push(...digitNums);
      } else {
        // Parse word numbers
        const words = clean.split(' ');
        let current = 0;
        let hasNum = false;
        for (const w of words) {
          if (wordNums[w] !== undefined) {
            if (wordNums[w] >= 100) {
              current = (current || 1) * wordNums[w];
            } else if (wordNums[w] >= 20 && current % 100 === 0) {
              current += wordNums[w];
            } else if (wordNums[w] < 20 && current % 10 === 0) {
              current += wordNums[w];
            } else {
              if (hasNum) numbers.push(current);
              current = wordNums[w];
            }
            hasNum = true;
          } else if (hasNum && !/^(and|a|the|of|is|its|per|at|in|by)$/.test(w)) {
            numbers.push(current);
            current = 0;
            hasNum = false;
          }
        }
        if (hasNum) numbers.push(current);
        // Also add any digit numbers found
        numbers.push(...digitNums);
      }

      console.log(`  Numbers found: ${JSON.stringify(numbers)}`);

      const ops = {
        add: /add|plus|sum|combined|total|together|gains?|new|accelerat/i,
        subtract: /subtract|minus|difference|less|fewer|loses?|reduc/i,
        multiply: /multiply|times|product|twice|double|triple/i,
        divide: /divide|split|quotient|per|half/i,
      };
      let answer: number | null = null;
      if (numbers.length >= 2) {
        const [a, b] = numbers;
        if (ops.multiply.test(clean)) answer = a * b;
        else if (ops.add.test(clean)) answer = a + b;
        else if (ops.subtract.test(clean)) answer = a - b;
        else if (ops.divide.test(clean) && b !== 0) answer = a / b;
      } else if (numbers.length === 1 && /twice|double/i.test(clean)) {
        answer = numbers[0] * 2;
      }
      if (answer !== null) {
        const rounded = Math.round(answer * 100) / 100;
        await proxy('POST', '/verify', {
          verification_code: verCode,
          answer: rounded.toString(),
        });
        console.log(`Challenge solved: ${rounded}`);
        // If comment was already created (success:true), verification publishes it — no retry needed
        if (result.success && result.comment?.id) {
          console.log(`Comment verified: ${result.comment.id.slice(0, 8)}`);
        } else {
          // Retry the comment (old-style challenge-then-post flow)
          const retry = await proxy('POST', `/posts/${postId}/comments`, body);
          if (retry.data || retry.success) {
            console.log(`Comment posted: ${(retry.data?.id || retry.comment?.id || '').slice(0, 8)}`);
          } else {
            console.error('Retry failed:', retry.error || retry);
          }
        }
      } else {
        console.error('Could not solve challenge:', verText);
      }
    } else if (result.data || result.success) {
      console.log(`Comment posted: ${(result.data?.id || result.comment?.id || '').slice(0, 8)}`);
    } else {
      console.error('Failed:', result.error || result);
    }
    break;
  }

  case 'post': {
    const submolt = args[0];
    const title = args[1];
    const content = args[2];
    if (!submolt || !title || !content) {
      console.error('Usage: molt post <submolt> "title" "content"');
      break;
    }

    const result = await proxy('POST', '/posts', {
      type: 'text', title, content, submolt,
    });

    if (result.verification_code) {
      console.log('Verification challenge — solving...');
      const text = result.challenge_text || '';
      const numbers = text.match(/\d+(\.\d+)?/g)?.map(Number) || [];
      let answer: number | null = null;
      const [a, b] = numbers;
      if (/add|plus|sum/i.test(text)) answer = a + b;
      else if (/subtract|minus/i.test(text)) answer = a - b;
      else if (/multiply|times/i.test(text)) answer = a * b;
      else if (/divide/i.test(text) && b) answer = a / b;

      if (answer !== null) {
        await proxy('POST', '/verify', {
          verification_code: result.verification_code,
          answer: (Math.round(answer * 100) / 100).toString(),
        });
        const retry = await proxy('POST', '/posts', { type: 'text', title, content, submolt });
        if (retry.data) console.log(`Post created: ${retry.data.id}`);
        else console.error('Retry failed:', retry.error || retry);
      }
    } else if (result.data) {
      console.log(`Post created: ${result.data.id}`);
    } else {
      console.error('Failed:', result.error || result);
    }
    break;
  }

  case 'search': {
    const query = args.join(' ');
    if (!query) { console.error('Usage: molt search <query>'); break; }

    const data = await proxy('GET', `/search?q=${encodeURIComponent(query)}&type=posts&limit=10`);
    const posts = data.data || [];
    console.log(`\n=== Search: "${query}" — ${posts.length} result(s) ===\n`);
    for (const p of posts) {
      fmtPost(p);
    }
    break;
  }

  case 'agent': {
    const name = args[0];
    if (!name) { console.error('Usage: molt agent <name>'); break; }

    const data = await proxy('GET', `/agents/${name}`);
    if (data.success === false || data.statusCode === 404) {
      // Try search by name
      const search = await proxy('GET', `/search?q=${encodeURIComponent(name)}&type=agents&limit=5`);
      console.log('Agent not found. Search results:', JSON.stringify(search, null, 2));
    } else {
      const a = data.agent || data.data || data;
      console.log(`\nAgent: ${a.name || a.display_name}`);
      console.log(`Karma: ${a.karma} | Posts: ${a.posts_count} | Comments: ${a.comments_count}`);
      console.log(`Followers: ${a.follower_count} | Following: ${a.following_count}`);
      console.log(`Verified: ${a.is_verified} | Claimed: ${a.is_claimed}`);
      console.log(`Created: ${a.created_at} | Last active: ${a.last_active}`);
      if (a.description) console.log(`\nBio: ${a.description}`);
    }
    break;
  }

  case 'notifications': {
    const data = await proxy('GET', '/notifications');
    console.log(JSON.stringify(data, null, 2));
    break;
  }

  default:
    console.log(`molt — Moltbook engagement CLI (via Docker proxy)

Commands:
  molt start              Start the proxy container
  molt stop               Stop the proxy container
  molt status             Proxy + PercyBot status
  molt home               Dashboard (notifications, activity)
  molt feed [submolt]     Browse feed (hot)
  molt comments <id>      Read post comments
  molt reply <id> "text"  Reply to a post
  molt post <sub> "title" "body"  Create a post
  molt search <query>     Search posts
  molt agent <name>       Look up an agent
  molt notifications      Raw notification list

All traffic goes through the sanitizing Docker proxy.
Moltbook content is never processed directly by this machine.`);
}

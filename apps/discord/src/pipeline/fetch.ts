// Percival Labs -- Multi-Strategy Content Fetcher
// Routes URLs to platform-specific extractors before falling back
// to Readability parsing or Jina Reader for JS-heavy sites.
//
// Strategy chain:
//   1. Platform extractors (X/Twitter, YouTube, Reddit, GitHub)
//   2. Readability (standard articles)
//   3. Jina Reader (JS-rendered sites)

import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { validateUrl } from '@percival/shared';
import type { ParsedArticle } from '../types';

const MAX_CONTENT_LENGTH = 50_000;
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = 'Percival-Labs-Bot/1.0';
const MIN_USEFUL_CONTENT = 100; // chars — below this, content is probably empty/blocked

// ---------------------------------------------------------------------------
// URL Classification
// ---------------------------------------------------------------------------

type Platform = 'twitter' | 'youtube' | 'reddit' | 'github' | 'generic';

function classifyUrl(url: string): Platform {
  const host = new URL(url).hostname.replace('www.', '');

  if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.x.com'))
    return 'twitter';
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com')
    return 'youtube';
  if (host === 'reddit.com' || host.endsWith('.reddit.com'))
    return 'reddit';
  if (host === 'github.com')
    return 'github';

  return 'generic';
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Fetch content from any URL using the best available strategy.
 * Validates against SSRF before any network request.
 */
export async function fetchArticle(url: string): Promise<ParsedArticle> {
  await validateUrl(url);

  const platform = classifyUrl(url);

  // Try platform-specific extractor first
  if (platform !== 'generic') {
    try {
      const result = await platformExtract(platform, url);
      if (result && result.content.length >= MIN_USEFUL_CONTENT) {
        return result;
      }
    } catch (err) {
      console.warn(`[fetch] ${platform} extractor failed for ${url}, falling back:`, (err as Error).message);
    }
  }

  // Try standard Readability extraction
  try {
    const result = await readabilityExtract(url);
    if (result.content.length >= MIN_USEFUL_CONTENT) {
      return result;
    }
    console.log(`[fetch] Readability got only ${result.content.length} chars for ${url}, trying Jina`);
  } catch (err) {
    console.warn(`[fetch] Readability failed for ${url}:`, (err as Error).message);
  }

  // Final fallback: Jina Reader (renders JS, returns markdown)
  return jinaExtract(url);
}

// ---------------------------------------------------------------------------
// Platform Router
// ---------------------------------------------------------------------------

function platformExtract(platform: Platform, url: string): Promise<ParsedArticle> {
  switch (platform) {
    case 'twitter': return extractTwitter(url);
    case 'youtube': return extractYouTube(url);
    case 'reddit':  return extractReddit(url);
    case 'github':  return extractGitHub(url);
    default:        throw new Error(`No extractor for ${platform}`);
  }
}

// ---------------------------------------------------------------------------
// Twitter/X — via fxtwitter.com API
// ---------------------------------------------------------------------------

async function extractTwitter(url: string): Promise<ParsedArticle> {
  // fxtwitter provides a JSON API: replace domain with api.fxtwitter.com
  const tweetUrl = new URL(url);
  const apiUrl = `https://api.fxtwitter.com${tweetUrl.pathname}`;

  const res = await fetchWithTimeout(apiUrl);
  const data = await res.json() as {
    code?: number;
    tweet?: {
      text?: string;
      author?: { name?: string; screen_name?: string };
      created_at?: string;
      replies?: number;
      retweets?: number;
      likes?: number;
      media?: { all?: Array<{ type?: string; url?: string }> };
      quote?: { text?: string; author?: { name?: string; screen_name?: string } };
    };
  };

  if (!data.tweet) {
    throw new Error(`fxtwitter returned no tweet data for ${url}`);
  }

  const t = data.tweet;
  const author = t.author?.name
    ? `${t.author.name} (@${t.author.screen_name})`
    : t.author?.screen_name ?? 'Unknown';

  // Build rich content from tweet data
  const parts: string[] = [];
  parts.push(t.text ?? '');

  if (t.quote?.text) {
    parts.push(`\n> Quoted tweet from @${t.quote.author?.screen_name ?? 'unknown'}:`);
    parts.push(`> ${t.quote.text}`);
  }

  if (t.media?.all?.length) {
    const mediaDescs = t.media.all.map(m => `[${m.type ?? 'media'}]`).join(', ');
    parts.push(`\nAttachments: ${mediaDescs}`);
  }

  const stats = [];
  if (t.likes) stats.push(`${t.likes} likes`);
  if (t.retweets) stats.push(`${t.retweets} retweets`);
  if (t.replies) stats.push(`${t.replies} replies`);
  if (stats.length) parts.push(`\nEngagement: ${stats.join(', ')}`);

  const content = parts.join('\n').trim();

  return {
    url,
    title: `${author} on X`,
    content: truncateContent(content),
    byline: author,
    siteName: 'X (Twitter)',
    excerpt: (t.text ?? '').slice(0, 200),
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

// ---------------------------------------------------------------------------
// YouTube — via oEmbed API + noembed for description
// ---------------------------------------------------------------------------

async function extractYouTube(url: string): Promise<ParsedArticle> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetchWithTimeout(oembedUrl);
  const data = await res.json() as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };

  // Also fetch the watch page for description
  let description = '';
  try {
    const pageRes = await fetchWithTimeout(url);
    const html = await pageRes.text();
    // Extract description from meta tags
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/) ||
                      html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/) ||
                      html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    if (descMatch?.[1]) {
      description = descMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    }
  } catch {
    // Non-fatal — we still have oEmbed data
  }

  const title = data.title ?? 'YouTube Video';
  const author = data.author_name ?? null;

  const parts: string[] = [];
  parts.push(`Video: "${title}"`);
  if (author) parts.push(`Channel: ${author}`);
  if (description) parts.push(`\nDescription:\n${description}`);

  const content = parts.join('\n').trim();

  return {
    url,
    title,
    content: truncateContent(content),
    byline: author,
    siteName: 'YouTube',
    excerpt: description.slice(0, 200) || title,
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

// ---------------------------------------------------------------------------
// Reddit — via .json API
// ---------------------------------------------------------------------------

async function extractReddit(url: string): Promise<ParsedArticle> {
  // Clean URL and append .json
  const cleanUrl = url.replace(/\?.*$/, '').replace(/\/$/, '');
  const jsonUrl = `${cleanUrl}.json`;

  const res = await fetchWithTimeout(jsonUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });
  const data = await res.json() as Array<{
    data?: {
      children?: Array<{
        data?: {
          title?: string;
          selftext?: string;
          author?: string;
          subreddit?: string;
          score?: number;
          num_comments?: number;
          url?: string;
          is_self?: boolean;
        };
      }>;
    };
  }>;

  // First element is the post, second is comments
  const post = data?.[0]?.data?.children?.[0]?.data;
  if (!post) throw new Error('Could not parse Reddit JSON');

  const parts: string[] = [];
  parts.push(`r/${post.subreddit ?? 'unknown'} — u/${post.author ?? 'unknown'}`);

  if (post.selftext) {
    parts.push(`\n${post.selftext}`);
  } else if (post.url && !post.is_self) {
    parts.push(`\nLink post: ${post.url}`);
  }

  const stats = [];
  if (post.score) stats.push(`${post.score} upvotes`);
  if (post.num_comments) stats.push(`${post.num_comments} comments`);
  if (stats.length) parts.push(`\n${stats.join(', ')}`);

  // Grab top comments
  const comments = data?.[1]?.data?.children ?? [];
  const topComments = comments
    .slice(0, 5)
    .map(c => c.data)
    .filter((c): c is NonNullable<typeof c> => !!c?.body)
    .map(c => `u/${c.author}: ${(c as { body: string }).body.slice(0, 500)}`);

  if (topComments.length) {
    parts.push('\n--- Top Comments ---');
    parts.push(topComments.join('\n\n'));
  }

  const content = parts.join('\n').trim();

  return {
    url,
    title: post.title ?? 'Reddit Post',
    content: truncateContent(content),
    byline: post.author ? `u/${post.author}` : null,
    siteName: post.subreddit ? `r/${post.subreddit}` : 'Reddit',
    excerpt: (post.selftext ?? post.title ?? '').slice(0, 200),
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

// ---------------------------------------------------------------------------
// GitHub — via API for repos, issues, PRs
// ---------------------------------------------------------------------------

async function extractGitHub(url: string): Promise<ParsedArticle> {
  const path = new URL(url).pathname.replace(/^\//, '').replace(/\/$/, '');
  const segments = path.split('/');

  // Determine what we're looking at
  if (segments.length >= 4 && (segments[2] === 'issues' || segments[2] === 'pull')) {
    return extractGitHubIssue(url, segments[0], segments[1], segments[3]);
  }

  if (segments.length >= 2) {
    return extractGitHubRepo(url, segments[0], segments[1]);
  }

  // Fall through to generic
  throw new Error('Unrecognized GitHub URL pattern');
}

async function extractGitHubRepo(url: string, owner: string, repo: string): Promise<ParsedArticle> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const res = await fetchWithTimeout(apiUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github.v3+json' },
  });
  const data = await res.json() as {
    full_name?: string;
    description?: string;
    stargazers_count?: number;
    forks_count?: number;
    language?: string;
    topics?: string[];
    license?: { spdx_id?: string };
    open_issues_count?: number;
    created_at?: string;
    pushed_at?: string;
  };

  // Try to get README
  let readme = '';
  try {
    const readmeRes = await fetchWithTimeout(`${apiUrl}/readme`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github.v3.raw' },
    });
    readme = await readmeRes.text();
    if (readme.length > 5000) readme = readme.slice(0, 5000) + '\n\n[README truncated]';
  } catch { /* no readme */ }

  const parts: string[] = [];
  parts.push(`${data.full_name ?? `${owner}/${repo}`}`);
  if (data.description) parts.push(data.description);

  const meta = [];
  if (data.language) meta.push(data.language);
  if (data.stargazers_count) meta.push(`${data.stargazers_count} stars`);
  if (data.forks_count) meta.push(`${data.forks_count} forks`);
  if (data.license?.spdx_id) meta.push(data.license.spdx_id);
  if (meta.length) parts.push(meta.join(' | '));

  if (data.topics?.length) parts.push(`Topics: ${data.topics.join(', ')}`);
  if (readme) parts.push(`\n--- README ---\n${readme}`);

  const content = parts.join('\n').trim();

  return {
    url,
    title: data.full_name ?? `${owner}/${repo}`,
    content: truncateContent(content),
    byline: owner,
    siteName: 'GitHub',
    excerpt: data.description ?? '',
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

async function extractGitHubIssue(
  url: string,
  owner: string,
  repo: string,
  number: string,
): Promise<ParsedArticle> {
  const type = url.includes('/pull/') ? 'pulls' : 'issues';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/${type}/${number}`;
  const res = await fetchWithTimeout(apiUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github.v3+json' },
  });
  const data = await res.json() as {
    title?: string;
    body?: string;
    user?: { login?: string };
    state?: string;
    labels?: Array<{ name?: string }>;
    comments?: number;
    created_at?: string;
  };

  const issueType = type === 'pulls' ? 'PR' : 'Issue';
  const parts: string[] = [];
  parts.push(`[${issueType}] ${data.title ?? 'Untitled'}`);
  parts.push(`${owner}/${repo}#${number} — ${data.state ?? 'unknown'}`);
  if (data.user?.login) parts.push(`Author: @${data.user.login}`);
  if (data.labels?.length) parts.push(`Labels: ${data.labels.map(l => l.name).join(', ')}`);
  if (data.body) parts.push(`\n${data.body}`);

  const content = parts.join('\n').trim();

  return {
    url,
    title: `${data.title ?? 'Untitled'} — ${owner}/${repo}#${number}`,
    content: truncateContent(content),
    byline: data.user?.login ? `@${data.user.login}` : null,
    siteName: 'GitHub',
    excerpt: (data.body ?? data.title ?? '').slice(0, 200),
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

// ---------------------------------------------------------------------------
// Readability (standard articles)
// ---------------------------------------------------------------------------

async function readabilityExtract(url: string): Promise<ParsedArticle> {
  const res = await fetchWithTimeout(url);
  const html = await res.text();
  if (!html.trim()) throw new Error(`Empty response from ${url}`);

  const { document } = parseHTML(html);

  const reader = new Readability(document as unknown as Document, {
    charThreshold: 100,
  });
  const article = reader.parse();

  let title: string;
  let content: string;
  let byline: string | null = null;
  let siteName: string | null = null;
  let excerpt: string | null = null;

  if (article) {
    title = article.title || extractTitleFallback(document) || url;
    content = article.textContent || '';
    byline = article.byline || null;
    siteName = article.siteName || null;
    excerpt = article.excerpt || null;
  } else {
    title = extractTitleFallback(document) || url;
    content = extractRawText(document);
  }

  content = content.replace(/\n{3,}/g, '\n\n').trim();

  return {
    url,
    title,
    content: truncateContent(content),
    byline,
    siteName,
    excerpt,
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

// ---------------------------------------------------------------------------
// Jina Reader — JS rendering fallback
// ---------------------------------------------------------------------------

async function jinaExtract(url: string): Promise<ParsedArticle> {
  const jinaUrl = `https://r.jina.ai/${url}`;

  const res = await fetchWithTimeout(jinaUrl, {
    headers: {
      Accept: 'text/plain',
      'X-Return-Format': 'markdown',
    },
    timeoutMs: 30_000, // Jina needs more time to render
  });

  const markdown = await res.text();
  if (!markdown.trim() || markdown.length < MIN_USEFUL_CONTENT) {
    throw new Error(`Jina returned insufficient content for ${url}`);
  }

  // Extract title from first markdown heading or first line
  let title = url;
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    title = headingMatch[1];
  } else {
    const firstLine = markdown.split('\n').find(l => l.trim().length > 0);
    if (firstLine && firstLine.length < 200) title = firstLine;
  }

  const content = markdown.replace(/\n{3,}/g, '\n\n').trim();

  return {
    url,
    title,
    content: truncateContent(content),
    byline: null,
    siteName: new URL(url).hostname,
    excerpt: content.slice(0, 200),
    wordCount: content.split(/\s+/).filter(Boolean).length,
  };
}

// ---------------------------------------------------------------------------
// Shared Utilities
// ---------------------------------------------------------------------------

interface FetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const timeout = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/json,*/*;q=0.8',
        ...options.headers,
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`);
    }

    return res;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Fetch timed out after ${timeout}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_LENGTH) return content;
  return content.slice(0, MAX_CONTENT_LENGTH);
}

function extractTitleFallback(document: ReturnType<typeof parseHTML>['document']): string | null {
  const titleEl = document.querySelector('title');
  if (titleEl?.textContent) return titleEl.textContent.trim();

  const h1 = document.querySelector('h1');
  if (h1?.textContent) return h1.textContent.trim();

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) return ogTitle.getAttribute('content') || null;

  return null;
}

function extractRawText(document: ReturnType<typeof parseHTML>['document']): string {
  for (const el of document.querySelectorAll('script, style, nav, footer, header')) {
    el.remove();
  }
  const body = document.querySelector('body');
  return body?.textContent?.trim() || '';
}

// Percival Labs -- Article Storage (SQLite)
// Stores processed articles for deduplication, feedback, and digest compilation.

import type { Database } from 'bun:sqlite';
import type { ProcessedArticle } from '../types';

/**
 * Store a fully processed article in SQLite.
 */
export function storeArticle(db: Database, article: ProcessedArticle): void {
  const stmt = db.prepare(`
    INSERT INTO articles (
      id, url, title, content, summary, apply_analysis,
      signal_analysis, score, route, discord_message_id,
      source_channel, processed_at
    ) VALUES (
      $id, $url, $title, $content, $summary, $applyAnalysis,
      $signalAnalysis, $score, $route, $discordMessageId,
      $sourceChannel, $processedAt
    )
  `);

  stmt.run({
    $id: article.id,
    $url: article.url,
    $title: article.title,
    $content: article.content,
    $summary: article.summary,
    $applyAnalysis: article.applyAnalysis,
    $signalAnalysis: article.signalAnalysis,
    $score: article.score,
    $route: article.route,
    $discordMessageId: article.discordMessageId,
    $sourceChannel: article.sourceChannel,
    $processedAt: article.processedAt,
  });
}

/**
 * Check if a URL has already been processed (deduplication).
 * Returns the existing article or null.
 */
export function getArticleByUrl(db: Database, url: string): ProcessedArticle | null {
  const stmt = db.prepare(`
    SELECT id, url, title, content, summary,
           apply_analysis AS applyAnalysis,
           signal_analysis AS signalAnalysis,
           score, route,
           discord_message_id AS discordMessageId,
           source_channel AS sourceChannel,
           processed_at AS processedAt
    FROM articles
    WHERE url = $url
    LIMIT 1
  `);

  const row = stmt.get({ $url: url }) as ProcessedArticle | null;
  return row ?? null;
}

/**
 * Update feedback for an article (reaction-based feedback loop).
 */
export function updateFeedback(db: Database, articleId: string, feedback: string): void {
  const stmt = db.prepare(`
    UPDATE articles SET feedback = $feedback WHERE id = $id
  `);

  stmt.run({ $id: articleId, $feedback: feedback });
}

/**
 * Get recent articles, optionally filtered by route.
 * Used for morning-brief and night-reads digest compilation.
 */
export function getRecentArticles(
  db: Database,
  limit: number,
  route?: string,
): ProcessedArticle[] {
  if (route) {
    const stmt = db.prepare(`
      SELECT id, url, title, content, summary,
             apply_analysis AS applyAnalysis,
             signal_analysis AS signalAnalysis,
             score, route,
             discord_message_id AS discordMessageId,
             source_channel AS sourceChannel,
             processed_at AS processedAt
      FROM articles
      WHERE route = $route
      ORDER BY processed_at DESC
      LIMIT $limit
    `);

    return stmt.all({ $route: route, $limit: limit }) as ProcessedArticle[];
  }

  const stmt = db.prepare(`
    SELECT id, url, title, content, summary,
           apply_analysis AS applyAnalysis,
           signal_analysis AS signalAnalysis,
           score, route,
           discord_message_id AS discordMessageId,
           source_channel AS sourceChannel,
           processed_at AS processedAt
    FROM articles
    ORDER BY processed_at DESC
    LIMIT $limit
  `);

  return stmt.all({ $limit: limit }) as ProcessedArticle[];
}

// Percival Labs - Trust Score Engine
// Calculates trust scores from verifiable signals

import { Database } from 'bun:sqlite';
import { TRUST_WEIGHTS, type TrustScore } from './types';

export function calculateTrustScore(db: Database, skillId: string, publisherId: string): TrustScore {
  const publisher = calculatePublisherScore(db, publisherId);
  const security = calculateSecurityScore(db, skillId);
  const quality = calculateQualityScore(db, skillId);
  const usage = calculateUsageScore(db, skillId);
  const community = calculateCommunityScore(db, skillId);

  const overall = Math.round(
    publisher * TRUST_WEIGHTS.publisher +
    security * TRUST_WEIGHTS.security +
    quality * TRUST_WEIGHTS.quality +
    usage * TRUST_WEIGHTS.usage +
    community * TRUST_WEIGHTS.community
  );

  return {
    overall,
    dimensions: { publisher, security, quality, usage, community },
  };
}

function calculatePublisherScore(db: Database, publisherId: string): number {
  const pub = db.query('SELECT * FROM publishers WHERE id = ?').get(publisherId) as any;
  if (!pub) return 0;

  let score = 0;

  // Verified identity: 20 points
  if (pub.verified_at) score += 20;

  // Account age: up to 15 points (max at 365 days)
  const ageMs = Date.now() - new Date(pub.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  score += Math.min(15, Math.round((ageDays / 365) * 15));

  // Published skills: up to 15 points (max at 10 skills)
  const skillCount = (db.query(
    "SELECT COUNT(*) as count FROM skills WHERE publisher_id = ? AND visibility = 'published'"
  ).get(publisherId) as { count: number }).count;
  score += Math.min(15, skillCount * 1.5);

  // Historical audits pass rate: up to 25 points
  const auditStats = db.query(`
    SELECT COUNT(*) as total, SUM(CASE WHEN a.status = 'pass' THEN 1 ELSE 0 END) as passed
    FROM audits a
    JOIN versions v ON a.version_id = v.id
    JOIN skills s ON v.skill_id = s.id
    WHERE s.publisher_id = ?
  `).get(publisherId) as { total: number; passed: number };
  if (auditStats.total > 0) {
    score += Math.round((auditStats.passed / auditStats.total) * 25);
  }

  // Community contribution: base points for being a publisher
  score += 5;

  return Math.min(100, score);
}

function calculateSecurityScore(db: Database, skillId: string): number {
  const latestVersion = db.query(
    'SELECT id FROM versions WHERE skill_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(skillId) as { id: string } | null;

  if (!latestVersion) return 0;

  const audits = db.query(
    'SELECT stage, status FROM audits WHERE version_id = ?'
  ).all(latestVersion.id) as { stage: string; status: string }[];

  let score = 0;
  for (const audit of audits) {
    if (audit.status !== 'pass') continue;
    switch (audit.stage) {
      case 'static': score += 25; break;
      case 'dynamic': score += 30; break;
      case 'human': score += 20; break;
      case 'continuous': score += 15; break;
    }
  }

  // Vulnerability history penalty
  const vulnCount = (db.query(`
    SELECT COUNT(*) as count FROM reports
    WHERE skill_id = ? AND category = 'malicious' AND status = 'resolved'
  `).get(skillId) as { count: number }).count;
  score -= vulnCount * 10;

  return Math.max(0, Math.min(100, score));
}

function calculateQualityScore(db: Database, skillId: string): number {
  const latestVersion = db.query(`
    SELECT manifest, readme FROM versions
    WHERE skill_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(skillId) as { manifest: string; readme: string } | null;

  if (!latestVersion) return 0;

  let score = 30; // Base for having a published version

  if (latestVersion.readme && latestVersion.readme.length > 100) score += 20;

  try {
    const manifest = JSON.parse(latestVersion.manifest);
    if (manifest.description?.length > 20) score += 10;
    if (manifest.tags?.length > 0) score += 10;
    if (manifest.homepage) score += 10;
    if (manifest.repository) score += 10;
    if (manifest.documentation) score += 10;
  } catch { /* invalid manifest */ }

  return Math.min(100, score);
}

function calculateUsageScore(db: Database, skillId: string): number {
  const result = db.query(
    'SELECT COUNT(DISTINCT i.agent_id) as count FROM installations i JOIN versions v ON i.version_id = v.id WHERE v.skill_id = ?'
  ).get(skillId) as { count: number };
  const installs = result.count;

  if (installs === 0) return 0;
  return Math.min(100, Math.round(Math.log10(installs) * 20));
}

function calculateCommunityScore(db: Database, skillId: string): number {
  const stats = db.query(
    'SELECT COALESCE(AVG(score), 0) as avg, COUNT(*) as count FROM ratings WHERE skill_id = ?'
  ).get(skillId) as { avg: number; count: number };

  if (stats.count === 0) return 50; // Neutral default

  const ratingScore = ((stats.avg - 1) / 4) * 80;
  const volumeBonus = Math.min(20, stats.count * 2);

  const reportCount = (db.query(
    "SELECT COUNT(*) as count FROM reports WHERE skill_id = ? AND status != 'dismissed'"
  ).get(skillId) as { count: number }).count;
  const reportPenalty = reportCount * 10;

  return Math.max(0, Math.min(100, Math.round(ratingScore + volumeBonus - reportPenalty)));
}

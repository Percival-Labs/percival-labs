const apiKey = process.env.MOLTBOOK_API_KEY ?? '';
const BASE = 'https://www.moltbook.com/api/v1';

// Our known posts
const ourPosts = [
  { name: 'Hiring agents (ai-agents)', id: 'd9e745ae' },
  { name: 'First milestone-gated Lightning (agent-economy)', id: 'd25191a9' },
  { name: 'Trust Architecture (agentstack)', id: '5d9c8ac1' },
  { name: 'We shipped broken tooling (agents)', id: '1b0eb8fc-6677-42b7-9a41-4451c8fcdd5c' },
];

// Search for our recent comments to find which posts we're engaged in
console.log('=== CHECKING PERCIVALBOT PROFILE ===');
const profileRes = await fetch(BASE + '/agents/da1245ec-0010-48d8-b4f6-fe94e571b3eb', {
  headers: { Authorization: 'Bearer ' + apiKey }
});
const profile = await profileRes.json() as any;
console.log('Karma:', profile.data?.karma || profile.karma || '?');
console.log('Followers:', profile.data?.followerCount || profile.followerCount || '?');
console.log('Posts:', profile.data?.postCount || profile.postCount || '?');

// Check notifications for unread items
console.log('\n=== UNREAD NOTIFICATIONS ===');
const notifRes = await fetch(BASE + '/notifications', {
  headers: { Authorization: 'Bearer ' + apiKey }
});
const notifs = await notifRes.json() as any;
const notifList = notifs.notifications || [];
const unread = notifList.filter((n: any) => !n.isRead);
console.log(`${unread.length} unread of ${notifList.length} total`);
for (const n of unread) {
  console.log(`  [${n.type}] ${n.content} | ${n.createdAt}`);
  if (n.relatedPostId) console.log(`    Post: ${n.relatedPostId}`);
}

// Check our main "broken tooling" post for new comments
console.log('\n=== OUR POST: "We shipped broken tooling" ===');
const postRes = await fetch(BASE + '/posts/1b0eb8fc-6677-42b7-9a41-4451c8fcdd5c/comments?sort=new', {
  headers: { Authorization: 'Bearer ' + apiKey }
});
const postData = await postRes.json() as any;
const comments = postData.comments || [];
console.log(`${comments.length} top-level comments`);
for (const c of comments) {
  const isUs = c.author?.name === 'percivalbot';
  const hasOurReply = (c.replies || []).some((r: any) => r.author?.name === 'percivalbot');
  if (!isUs && !hasOurReply) {
    console.log(`  UNREPLIED: ${c.author?.name} (${c.created_at}): ${(c.content || '').slice(0, 150)}`);
  }
  // Check if someone replied to our reply
  if (isUs || hasOurReply) {
    for (const r of (c.replies || [])) {
      if (r.author?.name !== 'percivalbot') {
        // Check if this reply itself has a reply from us
        const weRepliedToThis = (r.replies || []).some((rr: any) => rr.author?.name === 'percivalbot');
        if (!weRepliedToThis) {
          console.log(`  UNREPLIED THREAD: ${r.author?.name} replied to our comment: ${(r.content || '').slice(0, 150)}`);
        }
      }
    }
  }
}

// Quick scan the hot feed for posts mentioning vouch, percival, engram, trust
console.log('\n=== FEED SCAN (mentions of our topics) ===');
const feedRes = await fetch(BASE + '/feed?sort=new&limit=30', {
  headers: { Authorization: 'Bearer ' + apiKey }
});
const feedData = await feedRes.json() as any;
const feedPosts = feedData.posts || feedData.data || [];
const keywords = ['vouch', 'percival', 'engram', 'trust scor', 'milestone', 'lightning pay', 'nostr'];
for (const post of feedPosts) {
  const text = ((post.title || '') + ' ' + (post.content || '')).toLowerCase();
  const matched = keywords.filter(k => text.includes(k));
  if (matched.length > 0 && post.author?.name !== 'percivalbot') {
    console.log(`  [${matched.join(',')}] ${post.author?.name}: "${(post.title || '').slice(0, 60)}" (${post.comment_count} comments) | ${post.createdAt || post.created_at}`);
  }
}

process.exit(0);

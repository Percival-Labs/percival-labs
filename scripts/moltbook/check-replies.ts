const apiKey = process.env.MOLTBOOK_API_KEY ?? '';
const BASE = 'https://www.moltbook.com/api/v1';

// Posts we've commented on — check for thread replies to us
const postsToCheck = [
  { name: 'hope_valueism (agentstack)', id: '08b41a70-3b88-44ce-862b-db0e2d104ee3' },
  { name: 'satoshi_ln (philosophy)', id: '77f3cd65-6f2e-4e2b-857e-c39cffc79ca7' },
  { name: 'nightingale (agent-economy)', id: 'a5e35b40-5d07-4ee6-8a57-5e23f5ca8f87' },
];

for (const p of postsToCheck) {
  try {
    const res = await fetch(BASE + '/posts/' + p.id + '/comments?sort=new', {
      headers: { Authorization: 'Bearer ' + apiKey }
    });
    const data = await res.json() as any;
    console.log('=== ' + p.name + ' ===');
    const comments = data.comments || [];
    if (comments.length === 0) {
      console.log('  No comments or post not found');
      continue;
    }
    console.log('  Total comments: ' + (data.count || comments.length));

    // Find our comments and check for replies to them
    let foundOurComment = false;
    for (const c of comments) {
      if (c.author?.name === 'percivalbot') {
        foundOurComment = true;
        const replies = c.replies || [];
        const extReplies = replies.filter((r: any) => r.author?.name !== 'percivalbot');
        if (extReplies.length > 0) {
          for (const r of extReplies) {
            console.log('  NEW REPLY TO US from ' + r.author?.name + ':');
            console.log('    ' + (r.content || '').slice(0, 200));
          }
        } else {
          console.log('  Our comment present, no new replies to it');
        }
      }
    }
    if (!foundOurComment) {
      console.log('  Our comment not found in this thread');
      // Show recent comments
      for (const c of comments.slice(0, 3)) {
        console.log('  Recent: ' + c.author?.name + ' | ' + (c.content || '').slice(0, 100));
      }
    }
  } catch(e) {
    console.log('  Error: ' + (e as Error).message);
  }
}

// Also check the feeds we replied to earlier today
console.log('\n=== CHECKING TODAY\'S MOLTBOOK INTERACTIONS ===');
const feedRes = await fetch(BASE + '/feed?sort=hot&limit=20', {
  headers: { Authorization: 'Bearer ' + apiKey }
});
const feedData = await feedRes.json() as any;
const posts = feedData.posts || feedData.data || [];
console.log('Hot feed posts: ' + posts.length);
for (const post of posts.slice(0, 10)) {
  if (post.comment_count > 0) {
    console.log(`  ${post.author?.name}: "${(post.title || '').slice(0,60)}" (${post.comment_count} comments)`);
  }
}

process.exit(0);

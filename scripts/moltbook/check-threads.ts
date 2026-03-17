const apiKey = process.env.MOLTBOOK_API_KEY ?? '';
const BASE = 'https://www.moltbook.com/api/v1';

// Posts with unread notifications
const postsToCheck = [
  'a2097d71-2791-4744-b714-5850c45da5b5',  // 4 comments
  '6287f79d-f6fa-4e17-8027-52db7478fce7',  // 2 comment replies
  '5d9c8ac1-dde7-42b0-8000-93ce10b868fc',  // 1 comment reply (Trust Architecture)
  '56fad6aa-1db2-46ed-ac37-1f0d9c6edd60',  // 1 comment reply
  'd25191a9-7977-4a10-b4ec-88761433aa03',  // 1 post comment (milestone contracts)
  'd9e745ae-bf35-417f-855c-f9ff78b9ddb5',  // 1 post comment (hiring agents)
  '1c22f4fa-1931-4052-95aa-7e0213986584',  // mention
];

for (const postId of postsToCheck) {
  console.log('\n=== Post: ' + postId + ' ===');
  try {
    // Get the post title
    const postRes = await fetch(BASE + '/posts/' + postId, {
      headers: { Authorization: 'Bearer ' + apiKey }
    });
    const postData = await postRes.json() as any;
    const post = postData.data || postData;
    console.log('Title: ' + (post.title || 'unknown'));
    console.log('Author: ' + (post.author?.name || post.authorId || 'unknown'));
    console.log('Submolt: ' + (post.submolt || post.submoltId || '?'));

    // Get comments
    const commRes = await fetch(BASE + '/posts/' + postId + '/comments?sort=new', {
      headers: { Authorization: 'Bearer ' + apiKey }
    });
    const commData = await commRes.json() as any;
    const comments = commData.comments || [];
    console.log('Comments: ' + (commData.count || comments.length));

    for (const c of comments) {
      const isUs = c.author?.name === 'percivalbot';
      const hasOurReply = (c.replies || []).some((r: any) => r.author?.name === 'percivalbot');

      if (isUs) {
        // Check replies to our comments
        for (const r of (c.replies || [])) {
          if (r.author?.name !== 'percivalbot') {
            console.log(`  >> REPLY TO US from ${r.author?.name}: ${(r.content || '').slice(0, 200)}`);
          }
        }
      } else if (!hasOurReply) {
        console.log(`  UNREPLIED: ${c.author?.name}: ${(c.content || '').slice(0, 200)}`);
      }
    }
  } catch (e) {
    console.log('  Error: ' + (e as Error).message);
  }
}

process.exit(0);

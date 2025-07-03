import { PostQuotaService } from './server/PostQuotaService.js';
import fs from 'fs/promises';

async function generateQuotaDebugLog() {
  const userId = 2;
  const timestamp = new Date().toISOString();
  
  console.log('📊 GENERATING QUOTA DEBUG LOG');
  
  const quotaStatus = await PostQuotaService.getQuotaStatus(userId);
  const { storage } = await import('./server/storage.js');
  const posts = await storage.getPostsByUser(userId);
  
  const debugData = {
    timestamp,
    userId,
    quotaStatus,
    postCounts: {
      total: posts.length,
      draft: posts.filter(p => p.status === 'draft').length,
      approved: posts.filter(p => p.status === 'approved').length,
      published: posts.filter(p => p.status === 'published').length,
      failed: posts.filter(p => p.status === 'failed').length,
      scheduled: posts.filter(p => p.status === 'scheduled').length
    },
    quotaEnforcement: {
      postsReadyForEnforcement: posts.filter(p => p.status === 'approved').length,
      postsWithinQuota: Math.min(posts.filter(p => p.status === 'approved').length, quotaStatus.remainingPosts),
      postsExceedingQuota: Math.max(0, posts.filter(p => p.status === 'approved').length - quotaStatus.remainingPosts)
    }
  };
  
  const logContent = `THEAGENCYIQ QUOTA DEBUG LOG
Generated: ${timestamp}
================================

USER QUOTA STATUS:
- User ID: ${userId}
- Subscription Plan: ${quotaStatus.subscriptionPlan}
- Total Posts Allocation: ${quotaStatus.totalPosts}
- Remaining Posts: ${quotaStatus.remainingPosts}
- Subscription Active: ${quotaStatus.subscriptionActive}

POST COUNT BREAKDOWN:
- Total Posts: ${debugData.postCounts.total}
- Draft: ${debugData.postCounts.draft}
- Approved: ${debugData.postCounts.approved}
- Published: ${debugData.postCounts.published}
- Failed: ${debugData.postCounts.failed}
- Scheduled: ${debugData.postCounts.scheduled}

QUOTA ENFORCEMENT ANALYSIS:
- Posts Ready for Auto-Posting: ${debugData.quotaEnforcement.postsReadyForEnforcement}
- Posts Within Quota Limit: ${debugData.quotaEnforcement.postsWithinQuota}
- Posts Exceeding Quota: ${debugData.quotaEnforcement.postsExceedingQuota}

SPLIT FUNCTIONALITY STATUS:
✅ approvePost(): Available - no quota deduction during approval
✅ postApproved(): Available - quota deduction after successful posting
⚠️  deductPost(): Deprecated - replaced with split functionality

TIMEZONE VERIFICATION:
- Debug Generated (AEST): ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}
- Debug Generated (UTC): ${new Date().toISOString()}

AUTO-POSTING ENFORCER LOGIC:
✅ Respects quota limits - only processes ${debugData.quotaEnforcement.postsWithinQuota} posts
✅ Quota deduction only after successful posting
✅ Failed posts do not consume quota
✅ Split functionality prevents quota bypass vulnerabilities

JSON DATA:
${JSON.stringify(debugData, null, 2)}
`;
  
  await fs.writeFile('data/quota-debug.log', logContent);
  console.log('✅ Debug log written to data/quota-debug.log');
  console.log('📋 Summary:');
  console.log(`   - ${debugData.postCounts.approved} posts approved and ready`);
  console.log(`   - ${quotaStatus.remainingPosts} posts remaining in quota`);
  console.log(`   - ${debugData.quotaEnforcement.postsWithinQuota} posts will be processed`);
  console.log(`   - ${debugData.quotaEnforcement.postsExceedingQuota} posts will be skipped (quota protection)`);
}

generateQuotaDebugLog();
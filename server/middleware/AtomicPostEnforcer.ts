import { db } from '../db';
import { sql, eq } from 'drizzle-orm';
import { users, postSchedule } from '@shared/schema';
import { comprehensiveQuotaManager } from './ComprehensiveQuotaManager';

export class AtomicPostEnforcer {
  // FIXED: Atomic post enforcement with proper transaction
  async enforceAutoPosting(userId: string, platform: string, postData: any): Promise<{ 
    allowed: boolean; 
    remaining: number; 
    postId?: string 
  }> {
    return await comprehensiveQuotaManager.withBackoffRetry(
      async () => {
        return await db.transaction(async (tx) => {
          // Check quota atomically
          const quotaResult = await comprehensiveQuotaManager.enforceAutoPosting(userId, platform);
          
          if (!quotaResult.allowed) {
            return {
              allowed: false,
              remaining: quotaResult.remaining
            };
          }

          // Create post entry atomically
          const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await tx
            .insert(postSchedule)
            .values({
              postId,
              userId,
              content: postData.content || '',
              platform,
              status: 'scheduled',
              isCounted: false, // Only count when actually posted
              scheduledAt: new Date(),
              hasVideo: postData.hasVideo || false,
              videoApproved: postData.videoApproved || false,
              videoData: postData.videoData || null
            });

          console.log(`✅ Post ${postId} scheduled for ${platform} (quota: ${quotaResult.remaining} remaining)`);

          return {
            allowed: true,
            remaining: quotaResult.remaining,
            postId
          };
        });
      },
      3, // max retries
      1000 // 1 second base delay
    );
  }

  // Mark post as successfully posted and counted
  async markPostCompleted(postId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Update post status
      await tx
        .update(postSchedule)
        .set({
          status: 'posted',
          isCounted: true,
          approvedAt: new Date()
        })
        .where(eq(postSchedule.postId, postId));

      console.log(`✅ Post ${postId} marked as completed and counted`);
    });
  }

  // Handle post failure - don't count against quota
  async markPostFailed(postId: string, error: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Update post status but don't count
      await tx
        .update(postSchedule)
        .set({
          status: 'failed',
          isCounted: false // Don't count failed posts
        })
        .where(eq(postSchedule.postId, postId));

      // Refund the quota since post failed
      const post = await tx
        .select()
        .from(postSchedule)
        .where(eq(postSchedule.postId, postId))
        .limit(1);

      if (post[0]) {
        await tx
          .update(users)
          .set({
            remainingPosts: sql`${users.remainingPosts} + 1`, // Refund
            updatedAt: new Date()
          })
          .where(eq(users.id, post[0].userId));

        console.log(`♻️ Post ${postId} failed - quota refunded (error: ${error})`);
      }
    });
  }
}

export const atomicPostEnforcer = new AtomicPostEnforcer();
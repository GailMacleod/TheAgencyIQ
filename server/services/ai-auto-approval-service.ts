/**
 * AI Auto-Approval Service
 * Automatically approves AI-generated posts for testing
 */

import { storage } from '../storage';

export class AIAutoApprovalService {
  
  /**
   * Auto-approve AI-generated posts for seamless testing
   */
  static async autoApproveAIPost(postId: number): Promise<boolean> {
    try {
      const post = await storage.getPost(postId);
      if (!post) {
        console.log(`❌ Post not found: ${postId}`);
        return false;
      }

      // Check if post is AI-generated
      if (post.aiGenerated) {
        await storage.updatePost(postId, {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: 'ai-auto-approval'
        });
        
        console.log(`✅ Auto-approved AI-generated post: ${postId}`);
        return true;
      }

      console.log(`⚠️  Post ${postId} is not AI-generated, skipping auto-approval`);
      return false;
      
    } catch (error) {
      console.error('❌ Auto-approval failed:', error);
      return false;
    }
  }

  /**
   * Auto-approve all AI-generated posts for a user
   */
  static async autoApproveAllAIPosts(userId: number): Promise<number> {
    try {
      const posts = await storage.getPostsByUser(userId);
      let approvedCount = 0;

      for (const post of posts) {
        if (post.aiGenerated && post.status === 'draft') {
          const success = await this.autoApproveAIPost(post.id);
          if (success) {
            approvedCount++;
          }
        }
      }

      console.log(`✅ Auto-approved ${approvedCount} AI-generated posts for user ${userId}`);
      return approvedCount;
      
    } catch (error) {
      console.error('❌ Bulk auto-approval failed:', error);
      return 0;
    }
  }

  /**
   * Generate and auto-approve AI posts
   */
  static async generateAndApproveAIPost(userId: number, content: string, platforms: string[]): Promise<any> {
    try {
      // Create AI-generated post
      const post = await storage.createPost({
        userId,
        content,
        platforms: platforms.join(','),
        status: 'draft',
        aiGenerated: true,
        createdAt: new Date()
      });

      // Auto-approve the AI-generated post
      await this.autoApproveAIPost(post.id);

      console.log(`✅ Generated and auto-approved AI post: ${post.id}`);
      return post;
      
    } catch (error) {
      console.error('❌ Generate and approve failed:', error);
      throw error;
    }
  }

  /**
   * Check if post needs auto-approval
   */
  static async shouldAutoApprove(postId: number): Promise<boolean> {
    try {
      const post = await storage.getPost(postId);
      return post?.aiGenerated === true && post?.status === 'draft';
    } catch (error) {
      console.error('❌ Auto-approval check failed:', error);
      return false;
    }
  }
}

export { AIAutoApprovalService as aiAutoApprovalService };
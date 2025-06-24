/**
 * Quota Status Monitor - Real-time post count verification
 */

import { storage } from './storage';

export async function getQuotaStatus(userId: number) {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const posts = await storage.getPostsByUser(userId);
  const quotaLimits = { starter: 12, growth: 27, professional: 52 };
  const plan = user.subscriptionPlan?.toLowerCase() || 'professional';
  const limit = quotaLimits[plan as keyof typeof quotaLimits] || 52;

  const statusCounts = {
    pending: posts.filter(p => p.status === 'pending').length,
    draft: posts.filter(p => p.status === 'draft').length,
    approved: posts.filter(p => p.status === 'approved').length,
    published: posts.filter(p => p.status === 'published').length,
    success: posts.filter(p => p.status === 'success').length,
    failed: posts.filter(p => p.status === 'failed').length
  };

  const total = posts.length;
  const isCompliant = total <= limit;
  const remaining = Math.max(0, limit - total);

  return {
    userId,
    plan: user.subscriptionPlan,
    quota: {
      limit,
      current: total,
      remaining,
      compliant: isCompliant
    },
    breakdown: statusCounts,
    timestamp: new Date().toISOString()
  };
}
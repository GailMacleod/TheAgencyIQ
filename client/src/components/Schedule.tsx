import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

interface BrandPost {
  id: number;
  platform: string;
  content: string;
  scheduledFor: string;
  status: string;
  aiRecommendation: string;
}

const Schedule = () => {
  const [brandPosts, setBrandPosts] = useState<BrandPost[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const cacheRef = useRef(new Map<string, BrandPost[]>());
  const lastSyncRef = useRef<string | null>(null);

  // Fetch brand posts from xAI API with enhanced logging
  const { data: brandPostsData, isLoading, error } = useQuery({
    queryKey: ['/api/brand-posts'],
    queryFn: async () => {
      const currentDate = new Date().toISOString().split('T')[0];
      console.log(`Initiating brand posts fetch for ${currentDate}`);
      
      const response = await fetch('/api/brand-posts', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Brand posts API failed: ${response.status} ${response.statusText}`);
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Brand posts API response received:`, data);
      return data;
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000 // 10 minutes garbage collection
  });

  // Optimized sync with caching and detailed logging
  const syncBrandPosts = useCallback((postsData: BrandPost[]) => {
    const currentDate = new Date().toISOString().split('T')[0];
    const cacheKey = `${currentDate}-${JSON.stringify(postsData)}`;
    
    // Check cache first to prevent unnecessary re-renders
    if (cacheRef.current.has(cacheKey) && lastSyncRef.current === cacheKey) {
      console.log(`Using cached brand posts for ${currentDate}`);
      return;
    }
    
    try {
      console.log(`Processing ${postsData.length} brand posts for ${currentDate}`);
      
      setBrandPosts(postsData);
      setSyncStatus('success');
      cacheRef.current.set(cacheKey, postsData);
      lastSyncRef.current = cacheKey;
      
      console.log(`Schedule synced with Brand Purpose for ${currentDate} - ${postsData.length} posts loaded`);
    } catch (error: any) {
      setSyncStatus('error');
      console.error(`Schedule sync failed for ${currentDate}:`, error);
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        postsData
      });
      
      setBrandPosts([]);
    }
  }, []);

  // Sync brand posts with schedule
  useEffect(() => {
    if (brandPostsData?.posts) {
      syncBrandPosts(brandPostsData.posts);
    } else if (error) {
      const currentDate = new Date().toISOString().split('T')[0];
      console.error(`Brand posts fetch failed for ${currentDate}:`, error);
      setSyncStatus('error');
      setBrandPosts([]);
    }
  }, [brandPostsData, error, syncBrandPosts]);

  // Handle dropdown display of all planned posts
  const getPostsForDay = (date: Date): BrandPost[] => {
    const targetDate = new Date(date).toISOString().split('T')[0];
    return brandPosts.filter(post => {
      const postDate = new Date(post.scheduledFor).toISOString().split('T')[0];
      return postDate === targetDate;
    });
  };

  return {
    brandPosts,
    syncStatus,
    isLoading,
    error,
    getPostsForDay
  };
};

export default Schedule;
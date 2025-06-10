import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const Schedule = () => {
  const [brandPosts, setBrandPosts] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle');

  // Fetch brand posts from xAI API
  const { data: brandPostsData, isLoading, error } = useQuery({
    queryKey: ['/api/brand-posts'],
    queryFn: async () => {
      const response = await fetch('/api/brand-posts', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch brand posts');
      }
      return response.json();
    },
    retry: 2,
    retryDelay: 1000
  });

  // Sync brand posts with schedule
  useEffect(() => {
    if (brandPostsData?.posts) {
      const currentDate = new Date().toISOString().split('T')[0];
      
      try {
        setBrandPosts(brandPostsData.posts);
        setSyncStatus('success');
        console.log(`Schedule synced with Brand Purpose for ${currentDate}`);
      } catch (error) {
        setSyncStatus('error');
        console.error(`Schedule sync failed for ${currentDate}:`, error);
        
        // Fallback to empty array if sync fails
        setBrandPosts([]);
      }
    }
  }, [brandPostsData]);

  // Handle dropdown display of all planned posts
  const getPostsForDay = (date) => {
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
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrandPurpose({ posts = [] }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');

  const handleEditClick = (post) => {
    console.log('Edit clicked for', post.platform);
    setEditingPost(post);
    setEditContent(post.content);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    // Save logic would go here
    console.log('Saving edited content for', editingPost?.platform, ':', editContent);
    setIsEditModalOpen(false);
    setEditingPost(null);
    setEditContent('');
  };

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id} className="w-full">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{post.platform}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleEditClick(post)}
              >
                Edit Content
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{post.content}</p>
          </CardContent>
        </Card>
      ))}

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit {editingPost?.platform} Content</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Enter your post content..."
              rows={6}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
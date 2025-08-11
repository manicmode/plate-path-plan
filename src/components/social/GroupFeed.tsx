import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  ThumbsUp, 
  Smile,
  Send,
  Trophy,
  Target,
  Zap,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GroupFeedProps {
  friends: any[];
}

interface FeedPost {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  type: 'streak' | 'meal' | 'challenge' | 'achievement';
  content: string;
  timestamp: Date;
  reactions: Array<{ emoji: string; count: number; userReacted: boolean }>;
  comments: Array<{ user: string; text: string; timestamp: Date }>;
}

const mockFeedPosts: FeedPost[] = [
  {
    id: '1',
    user: { name: 'Alex 🦄', avatar: '🦄' },
    type: 'streak',
    content: 'Just hit a 15-day nutrition logging streak! 🔥',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    reactions: [
      { emoji: '🔥', count: 5, userReacted: true },
      { emoji: '👏', count: 3, userReacted: false },
      { emoji: '💪', count: 2, userReacted: false }
    ],
    comments: [
      { user: 'Friend', text: 'Amazing work! Keep it up! 💪', timestamp: new Date(Date.now() - 1000 * 60 * 10) }
    ]
  },
  {
    id: '2',
    user: { name: 'Friend 🌟', avatar: '🌟' },
    type: 'meal',
    content: 'Logged a perfectly balanced breakfast: overnight oats with berries and almonds! 🥣✨',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    reactions: [
      { emoji: '😍', count: 7, userReacted: false },
      { emoji: '🥣', count: 4, userReacted: true }
    ],
    comments: []
  },
  {
    id: '3',
    user: { name: 'Sam 🔥', avatar: '🔥' },
    type: 'challenge',
    content: 'Just joined the "7-Day Hydration Challenge"! Who wants to join me? 💧',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    reactions: [
      { emoji: '💧', count: 6, userReacted: false },
      { emoji: '🙋‍♀️', count: 3, userReacted: true }
    ],
    comments: [
      { user: 'Jordan', text: 'Count me in! 🙌', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3) },
      { user: 'Casey', text: 'Already drinking more water today!', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) }
    ]
  },
  {
    id: '4',
    user: { name: 'Jordan 🚀', avatar: '🚀' },
    type: 'achievement',
    content: 'Unlocked the "Protein Pro" badge for hitting my protein goals 7 days in a row! 💪',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    reactions: [
      { emoji: '🏆', count: 8, userReacted: true },
      { emoji: '💪', count: 5, userReacted: false }
    ],
    comments: []
  }
];

const getPostIcon = (type: string) => {
  switch (type) {
    case 'streak': return <Zap className="h-4 w-4" />;
    case 'meal': return <Target className="h-4 w-4" />;
    case 'challenge': return <Trophy className="h-4 w-4" />;
    case 'achievement': return <Trophy className="h-4 w-4" />;
    default: return <Calendar className="h-4 w-4" />;
  }
};

const getPostColor = (type: string) => {
  switch (type) {
    case 'streak': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'meal': return 'text-green-600 bg-green-50 border-green-200';
    case 'challenge': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'achievement': return 'text-purple-600 bg-purple-50 border-purple-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const GroupFeed = ({ friends }: GroupFeedProps) => {
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [posts, setPosts] = useState(mockFeedPosts);

  const handleReaction = (postId: string, emoji: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const reactions = post.reactions.map(reaction => {
          if (reaction.emoji === emoji) {
            return {
              ...reaction,
              count: reaction.userReacted ? reaction.count - 1 : reaction.count + 1,
              userReacted: !reaction.userReacted
            };
          }
          return { ...reaction, userReacted: false };
        });
        return { ...post, reactions };
      }
      return post;
    }));
  };

  const handleComment = (postId: string) => {
    const comment = newComment[postId];
    if (!comment?.trim()) return;

    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [
            ...post.comments,
            { user: 'You', text: comment, timestamp: new Date() }
          ]
        };
      }
      return post;
    }));

    setNewComment({ ...newComment, [postId]: '' });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">Group Feed</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Stay updated with your friends' wellness journey
        </p>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="transition-all duration-300 hover:shadow-md animate-fade-in">
              <CardContent className="p-4">
                {/* Post Header */}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{post.user.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{post.user.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPostColor(post.type)}`}
                      >
                        {getPostIcon(post.type)}
                        <span className="ml-1 capitalize">{post.type}</span>
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <div className="mb-4">
                  <p className="text-sm">{post.content}</p>
                </div>

                {/* Reactions */}
                <div className="flex items-center gap-2 mb-3">
                  {post.reactions.map((reaction) => (
                    <Button
                      key={reaction.emoji}
                      variant={reaction.userReacted ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleReaction(post.id, reaction.emoji)}
                    >
                      <span className="mr-1">{reaction.emoji}</span>
                      {reaction.count}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => handleReaction(post.id, '❤️')}
                  >
                    <Heart className="h-3 w-3 mr-1" />
                    React
                  </Button>
                </div>

                {/* Comments */}
                {post.comments.length > 0 && (
                  <div className="space-y-2 mb-3 pl-4 border-l-2 border-muted">
                    {post.comments.map((comment, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{comment.user}</span>
                        <span className="ml-2">{comment.text}</span>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={newComment[post.id] || ''}
                    onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleComment(post.id)}
                    disabled={!newComment[post.id]?.trim()}
                    className="h-8"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {posts.length === 0 && (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No posts yet</h3>
              <p className="text-sm text-muted-foreground">
                Start your wellness journey to see activity here
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
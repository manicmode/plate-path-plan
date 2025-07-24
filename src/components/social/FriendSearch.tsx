import React, { useState } from 'react';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useFriendSearch } from '@/hooks/useFriendSearch';
import { useDebounce } from '@/hooks/useDebounce';
import { validateUUID, sanitizeText } from '@/lib/validation';
import { toast } from 'sonner';

export const FriendSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { searchResults, isSearching, searchUsers, sendFriendRequest } = useFriendSearch();

  React.useEffect(() => {
    if (debouncedSearchTerm) {
      const sanitizedTerm = sanitizeText(debouncedSearchTerm);
      if (sanitizedTerm.length >= 2) {
        searchUsers(sanitizedTerm);
      }
    }
  }, [debouncedSearchTerm, searchUsers]);

  const handleSendRequest = async (userId: string) => {
    if (!validateUUID(userId)) {
      toast.error('Invalid user ID');
      return;
    }
    await sendFriendRequest(userId);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(sanitizeText(e.target.value))}
          className="pl-10"
          maxLength={100}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Search Results</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((user) => (
              <Card key={user.user_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {user.display_name?.charAt(0) || '👤'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {user.display_name || user.email}
                          </h4>
                        </div>
                        
                        {user.email && user.display_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        )}
                        
                        {/* Streak info */}
                        <div className="flex gap-1 mt-1">
                          {user.current_nutrition_streak > 0 && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              🥗 {user.current_nutrition_streak}d
                            </Badge>
                          )}
                          {user.current_hydration_streak > 0 && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              💧 {user.current_hydration_streak}d
                            </Badge>
                          )}
                          {user.current_supplement_streak > 0 && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              💊 {user.current_supplement_streak}d
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendRequest(user.user_id)}
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {searchTerm && !isSearching && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No users found for "{searchTerm}"</p>
          <p className="text-xs mt-1">Try searching by username or email</p>
        </div>
      )}
    </div>
  );
};
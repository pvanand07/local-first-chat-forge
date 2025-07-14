import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, MessageSquare, Search, MoreHorizontal, Edit2, Trash2, Settings, FileText, LogOut, User, UserPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Conversation, Message } from '@/lib/database';
import { conversationManager } from '@/lib/conversation-manager';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onSearch: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

interface SearchResults {
  conversations: Conversation[];
  messageResults: Array<{
    conversation: Conversation;
    matchingMessages: Array<{
      message: Message;
      score: number;
      highlights: string;
    }>;
  }>;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onRenameConversation,
  onSearch,
  isLoading = false,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { user, signOut } = useAuth();

  // Perform search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await conversationManager.searchConversations(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Determine which conversations to show
  const displayConversations = searchResults ? searchResults.conversations : conversations;
  const hasMessageMatches = searchResults?.messageResults.length > 0;

  const handleRename = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <div className={cn(
      "w-80 h-screen flex flex-col backdrop-blur-lg sidebar-content",
      className
    )}>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-chat-border/60">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-semibold flex items-center gap-2 md:gap-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            <MessageSquare className="h-4 md:h-5 w-4 md:w-5 text-primary" />
            Conversations
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                variant="outline"
                className={cn(
                  "bg-gradient-to-r from-background to-secondary/30",
                  "border-border/60 hover:border-primary/50",
                  "shadow-sm hover:shadow-md transition-all duration-300",
                  "hover:scale-105 active:scale-95"
                )}
              >
                {user ? <User className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user ? (
                <>
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to="/auth" className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign in / Sign up
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button 
          onClick={onCreateConversation}
          className={cn(
            "w-full mb-3 md:mb-4 h-10 md:h-11 text-sm font-medium",
            "button-soft"
          )}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">New Conversation</span>
          <span className="sm:hidden">New Chat</span>
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch(e.target.value);
            }}
            placeholder="Search conversations..."
            className={cn(
              "pl-10 md:pl-11 pr-9 md:pr-10 h-10 md:h-11 rounded-lg md:rounded-xl text-sm",
              "input-soft",
              "focus:ring-2 focus:ring-primary/30 focus:border-primary/60"
            )}
          />
          {isSearching && (
            <div className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-3 md:h-4 w-3 md:w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
        
        {/* Search results info */}
        {searchQuery && searchResults && (
          <div className="mt-3 px-1 text-xs text-muted-foreground/80 font-medium">
            {searchResults.conversations.length} conversations found
            {hasMessageMatches && ` (${searchResults.messageResults.length} with matching messages)`}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 sidebar-scroll">
        <div className="p-2 md:p-3 space-y-1 md:space-y-2">
          {displayConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {searchQuery ? (
                <>
                  <p className="text-sm">No results found</p>
                  <p className="text-xs">Try different search terms</p>
                </>
              ) : (
                <>
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs">Start a new conversation to get started</p>
                </>
              )}
            </div>
          ) : (
            displayConversations.map((conversation) => {
              // Find message matches for this conversation
              const messageMatch = searchResults?.messageResults.find(
                result => result.conversation.id === conversation.id
              );

              return (
              <div
                key={conversation.id}
                className={cn(
                  "group relative rounded-lg md:rounded-xl p-3 md:p-4 cursor-pointer transition-all duration-300",
                  "hover:shadow-sm active:scale-[0.98] md:hover:scale-[1.02]",
                  activeConversationId === conversation.id 
                    ? "card-soft border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 shadow-md" 
                    : "card-soft border-transparent hover:border-border/40"
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                        onBlur={confirmRename}
                        className="h-6 text-sm"
                        autoFocus
                      />
                    ) : (
                      <h3 className="font-medium text-sm truncate">
                        {conversation.title}
                      </h3>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(conversation.updatedAt).toLocaleDateString()}
                    </p>
                    
                    {/* Show message matches when searching */}
                    {messageMatch && messageMatch.matchingMessages.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {messageMatch.matchingMessages.slice(0, 2).map((match, index) => (
                          <div 
                            key={match.message.id} 
                            className="text-xs bg-muted/40 rounded px-2 py-1"
                            style={{ borderLeft: '2px solid var(--primary, #22c55e)' }}
                          >
                            <div 
                              className="text-muted-foreground leading-snug"
                              style={{ fontSize: '0.92em', lineHeight: '1.3' }}
                              dangerouslySetInnerHTML={{ 
                                __html: match.highlights.length > 100 
                                  ? match.highlights.substring(0, 100) + '...' 
                                  : match.highlights 
                              }}
                            />
                          </div>
                        ))}
                        {messageMatch.matchingMessages.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center opacity-70 mt-1">
                            +{messageMatch.matchingMessages.length - 2} more matches
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(conversation);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{conversation.title}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteConversation(conversation.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>

                {/* Sync Status Indicator */}
                {conversation.syncStatus === 'pending' && (
                  <div className="absolute top-2 right-2 h-2 w-2 bg-yellow-500 rounded-full" />
                )}
                {conversation.syncStatus === 'conflict' && (
                  <div className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
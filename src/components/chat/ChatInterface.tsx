import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Message, Conversation } from '@/lib/database';
import { conversationManager } from '@/lib/conversation-manager';
import { syncEngine } from '@/lib/sync-engine';
import { MessageList, MessageListRef } from './MessageList';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Wifi, WifiOff, RefreshCw, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ChatInterface: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [streamContent, setStreamContent] = useState('');
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const messageListRef = useRef<MessageListRef>(null);
  const { toast } = useToast();

  // Initialize and load conversations
  useEffect(() => {
    initializeConversations();
    
    // Mobile detection and resize handler
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On desktop, show sidebar by default; on mobile, hide by default
      if (!mobile && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
      
      // Detect keyboard on mobile
      if (mobile) {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const standardHeight = window.screen.height;
        const keyboardVisible = currentHeight < standardHeight * 0.75;
        setIsKeyboardVisible(keyboardVisible);
      }
    };
    
    // Initial check
    checkMobile();
    
    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', checkMobile);
    window.visualViewport?.addEventListener('resize', checkMobile);
    
    // Sync status polling
    const syncStatusInterval = setInterval(updateSyncStatus, 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', checkMobile);
      window.visualViewport?.removeEventListener('resize', checkMobile);
      clearInterval(syncStatusInterval);
    };
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const initializeConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const convs = await conversationManager.getConversations();
      setConversations(convs);
      
      // Auto-select the most recent conversation
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await conversationManager.getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    }
  };

  const updateSyncStatus = async () => {
    try {
      const status = await syncEngine.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to get sync status:', error);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const conversation = await conversationManager.createConversation();
      setConversations(prev => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      setMessages([]);
      
      toast({
        title: "New conversation created",
        description: "You can start chatting now!"
      });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await conversationManager.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (activeConversationId === conversationId) {
        const remaining = conversations.filter(c => c.id !== conversationId);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
      
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed"
      });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
    }
  };

  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    try {
      await conversationManager.updateConversationTitle(conversationId, newTitle);
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, title: newTitle } : c
      ));
      
      toast({
        title: "Conversation renamed",
        description: "The conversation title has been updated"
      });
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      toast({
        title: "Error",
        description: "Failed to rename conversation",
        variant: "destructive"
      });
    }
  };

  const handleSearch = useCallback((query: string) => {
    // This could be enhanced to search message content
    console.log('Searching:', query);
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) {
      await handleCreateConversation();
      // Wait for the conversation to be created
      return;
    }

    try {
      setIsLoading(true);
      setStreamContent('');
      
      // Create temporary streaming message
      const tempMessage: Message = {
        id: 'temp-ai',
        conversation_id: activeConversationId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        syncStatus: 'pending',
        vector: {}
      };
      setStreamingMessage(tempMessage);

      await conversationManager.sendMessage(
        activeConversationId,
        content,
        (token: string) => {
          setStreamContent(prev => prev + token);
        },
        (userMessage: Message) => {
          // Immediately show the user message
          setMessages(prev => [...prev, userMessage]);
        }
      );

      // Reload messages from database to get the latest state (to get the AI message)
      await loadMessages(activeConversationId);
      setStreamingMessage(null);
      setStreamContent('');
      
      // Refresh conversation data to get updated title and timestamp
      const updatedConversation = await conversationManager.getConversation(activeConversationId);
      if (updatedConversation) {
        setConversations(prev => {
          const updated = prev.map(c => 
            c.id === activeConversationId 
              ? updatedConversation 
              : c
          );
          return updated.sort((a, b) => b.updatedAt - a.updatedAt);
        });
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
      setStreamingMessage(null);
      setStreamContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async () => {
    try {
      await syncEngine.forcSync();
      toast({
        title: "Sync completed",
        description: "Your data has been synchronized"
      });
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Failed to synchronize data",
        variant: "destructive"
      });
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex chat-container relative">
      {/* Mobile Backdrop */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "relative z-50 transition-transform duration-300 ease-in-out",
        isMobile ? (
          isSidebarOpen 
            ? "fixed inset-y-0 left-0 w-80 transform translate-x-0" 
            : "fixed inset-y-0 left-0 w-80 transform -translate-x-full"
        ) : (
          isSidebarOpen 
            ? "w-80 flex-shrink-0" 
            : "w-0 overflow-hidden"
        )
      )}>
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => {
            handleSelectConversation(id);
            if (isMobile) closeSidebar();
          }}
          onCreateConversation={() => {
            handleCreateConversation();
            if (isMobile) closeSidebar();
          }}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onSearch={handleSearch}
          isLoading={isLoadingConversations}
          className="card-soft border-r h-full"
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Header */}
        <div className="border-b border-chat-border/60 p-4 md:p-6 input-soft backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSidebar}
                className={cn(
                  "md:hidden",
                  "bg-gradient-to-r from-background to-secondary/30",
                  "border-border/60 hover:border-primary/50",
                  "shadow-sm hover:shadow-md transition-all duration-300",
                  "hover:scale-105 active:scale-95"
                )}
              >
                {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>

              {/* Desktop Sidebar Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSidebar}
                className={cn(
                  "hidden md:flex",
                  "bg-gradient-to-r from-background to-secondary/30",
                  "border-border/60 hover:border-primary/50",
                  "shadow-sm hover:shadow-md transition-all duration-300",
                  "hover:scale-105 active:scale-95"
                )}
              >
                <Menu className="h-4 w-4" />
              </Button>

              <h1 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent truncate">
                {activeConversationId 
                  ? conversations.find(c => c.id === activeConversationId)?.title || 'Chat'
                  : 'Local-First AI Chat'
                }
              </h1>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              {/* Network Status */}
              <div className={cn(
                "hidden sm:flex items-center gap-2 text-xs px-2 md:px-3 py-1 md:py-2 rounded-full backdrop-blur-sm transition-all duration-300",
                "border border-opacity-60 shadow-sm",
                isOnline 
                  ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 dark:from-green-950/50 dark:to-emerald-950/50 dark:text-green-300 dark:border-green-800"
                  : "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 dark:from-red-950/50 dark:to-rose-950/50 dark:text-red-300 dark:border-red-800"
              )}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                <span className="font-medium hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {/* Sync Status */}
              {syncStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceSync}
                  className={cn(
                    "hidden sm:flex text-xs px-2 md:px-3 py-1 md:py-2 h-auto",
                    "bg-gradient-to-r from-background to-secondary/30",
                    "border-border/60 hover:border-primary/50",
                    "shadow-sm hover:shadow-md transition-all duration-300",
                    "hover:scale-105 active:scale-95"
                  )}
                >
                  <RefreshCw className="h-3 w-3 mr-1 md:mr-2" />
                  <span className="font-medium hidden md:inline">
                    {syncStatus.pendingItems > 0 
                      ? `${syncStatus.pendingItems} pending`
                      : 'Synced'
                    }
                  </span>
                </Button>
              )}

              {/* Theme Toggle */}
              <ThemeToggle 
                variant="dropdown" 
                size="sm" 
                className="shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 relative overflow-hidden">
          <MessageList
            ref={messageListRef}
            messages={messages}
            isLoading={isLoading}
            streamingMessage={streamingMessage}
            streamContent={streamContent}
            className={cn(
              "absolute inset-0 p-2 md:p-4 pb-40 md:pb-44 message-list-container",
              isMobile && isKeyboardVisible && "mobile-keyboard-padding"
            )}
          />

          {/* Floating Input */}
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isLoading}
              placeholder={
                activeConversationId 
                  ? "Type your message..."
                  : "Start a new conversation..."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
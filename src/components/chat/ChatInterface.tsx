import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Message, Conversation } from '@/lib/database';
import { conversationManager } from '@/lib/conversation-manager';
import { syncEngine } from '@/lib/sync-engine';
import { MessageList, MessageListRef } from './MessageList';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
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

  const messageListRef = useRef<MessageListRef>(null);
  const { toast } = useToast();

  // Initialize and load conversations
  useEffect(() => {
    initializeConversations();
    
    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Sync status polling
    const syncStatusInterval = setInterval(updateSyncStatus, 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
        }
      );

      // Reload messages from database to get the latest state
      await loadMessages(activeConversationId);
      setStreamingMessage(null);
      setStreamContent('');
      
      // Update conversation list order
      setConversations(prev => {
        const updated = prev.map(c => 
          c.id === activeConversationId 
            ? { ...c, updatedAt: Date.now() } 
            : c
        );
        return updated.sort((a, b) => b.updatedAt - a.updatedAt);
      });

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

  return (
    <div className="h-screen flex bg-chat-bg">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={handleCreateConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onSearch={handleSearch}
        isLoading={isLoadingConversations}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-chat-border p-4 bg-chat-input">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {activeConversationId 
                ? conversations.find(c => c.id === activeConversationId)?.title || 'Chat'
                : 'Local-First AI Chat'
              }
            </h1>
            
            <div className="flex items-center gap-2">
              {/* Network Status */}
              <div className={cn(
                "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                isOnline 
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              )}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>

              {/* Sync Status */}
              {syncStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceSync}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {syncStatus.pendingItems > 0 
                    ? `${syncStatus.pendingItems} pending`
                    : 'Synced'
                  }
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <MessageList
          ref={messageListRef}
          messages={messages}
          isLoading={isLoading}
          streamingMessage={streamingMessage}
          streamContent={streamContent}
          className="flex-1"
        />

        {/* Input */}
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
  );
};
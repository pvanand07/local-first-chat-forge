import { v4 as uuidv4 } from 'uuid';
import { db, Conversation, Message, SyncItem, localDeviceId } from './database';
import { aiService, ChatMessage } from './ai-service';
import { supabase } from '@/integrations/supabase/client';

class ConversationManager {
  private cache = new Map<string, Message[]>();
  private cacheOrder: string[] = [];
  private readonly MAX_CACHE_SIZE = 5;

  async createConversation(title: string = 'New Conversation'): Promise<Conversation> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const conversation: Conversation = {
      id: uuidv4(),
      title,
      user_id: user?.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
      vector: { [localDeviceId]: Date.now() }
    };

    await db.conversations.add(conversation);
    await this.addToSyncQueue('create', 'conversation', conversation);
    return conversation;
  }

  async getConversations(): Promise<Conversation[]> {
    try {
      const conversations = await db.conversations
        .orderBy('updatedAt')
        .reverse()
        .limit(50)
        .toArray();
      
      return conversations;
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    try {
      return await db.conversations.get(conversationId);
    } catch (error) {
      console.error('Failed to get conversation:', error);
      return undefined;
    }
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    try {
      const now = Date.now();
      await db.conversations.update(conversationId, {
        title,
        updatedAt: now,
        syncStatus: 'pending',
        vector: { [localDeviceId]: now }
      });

      const conversation = await db.conversations.get(conversationId);
      if (conversation) {
        await this.addToSyncQueue('update', 'conversation', conversation);
      }
    } catch (error) {
      console.error('Failed to update conversation title:', error);
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Delete all messages in the conversation
      await db.messages.where('conversation_id').equals(conversationId).delete();
      
      // Delete the conversation
      await db.conversations.delete(conversationId);
      
      // Remove from cache
      this.cache.delete(conversationId);
      const index = this.cacheOrder.indexOf(conversationId);
      if (index > -1) {
        this.cacheOrder.splice(index, 1);
      }

      // Add to sync queue
      await this.addToSyncQueue('delete', 'conversation', { id: conversationId });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      // Cache-first strategy
      if (this.cache.has(conversationId)) {
        this.updateCacheOrder(conversationId);
        return this.cache.get(conversationId)!;
      }

      // Fetch from DB with pagination (latest 100 messages)
      const messages = await db.messages
        .where('conversation_id')
        .equals(conversationId)
        .sortBy('timestamp');

      // Update cache
      this.cache.set(conversationId, messages);
      this.cacheOrder.push(conversationId);
      
      // Enforce cache limit
      if (this.cacheOrder.length > this.MAX_CACHE_SIZE) {
        const oldestId = this.cacheOrder.shift()!;
        this.cache.delete(oldestId);
      }

      return messages;
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  async sendMessage(
    conversationId: string, 
    content: string,
    onAIToken: (token: string) => void,
    apiKey?: string
  ): Promise<{ userMessage: Message; aiMessage: Message }> {
    try {
      // Create user message
      const userMessage: Message = {
        id: uuidv4(),
        conversation_id: conversationId,
        role: 'user',
        content,
        timestamp: Date.now(),
        syncStatus: 'pending',
        vector: { [localDeviceId]: Date.now() }
      };

      await db.messages.add(userMessage);
      await db.addMessageToSearch(userMessage);
      await this.updateConversationTimestamp(conversationId);
      await this.addToSyncQueue('create', 'message', userMessage);

      // Clear cache to force reload from database
      this.cache.delete(conversationId);

      // Get conversation history for AI context
      const messages = await this.getMessages(conversationId);
      const history: ChatMessage[] = messages
        .slice(-10) // Only use last 10 messages for context
        .map(m => ({ role: m.role, content: m.content }));

      // Generate AI response
      const aiMessage = await aiService.generateResponse(
        history,
        conversationId,
        onAIToken,
        apiKey
      );

      await db.messages.add(aiMessage);
      await db.addMessageToSearch(aiMessage);
      await this.updateConversationTimestamp(conversationId);
      await this.addToSyncQueue('create', 'message', aiMessage);

      // Clear cache to ensure fresh data on next load
      this.cache.delete(conversationId);

      // Auto-generate conversation title if this is the first exchange
      if (messages.length === 1) { // Only user message exists
        this.generateConversationTitle(conversationId, content);
      }

      return { userMessage, aiMessage };
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Create error message
      const errorMessage: Message = {
        id: uuidv4(),
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: Date.now(),
        syncStatus: 'pending',
        vector: { [localDeviceId]: Date.now() }
      };

      const userMessage: Message = {
        id: uuidv4(),
        conversation_id: conversationId,
        role: 'user',
        content,
        timestamp: Date.now() - 1,
        syncStatus: 'pending',
        vector: { [localDeviceId]: Date.now() - 1 }
      };

      return { userMessage, aiMessage: errorMessage };
    }
  }

  private async generateConversationTitle(conversationId: string, firstMessage: string) {
    try {
      // Generate a simple title from the first message
      const words = firstMessage.split(' ').slice(0, 4);
      const title = words.join(' ') + (firstMessage.split(' ').length > 4 ? '...' : '');
      await this.updateConversationTitle(conversationId, title);
    } catch (error) {
      console.error('Failed to generate conversation title:', error);
    }
  }

  private async updateConversationTimestamp(conversationId: string) {
    try {
      const now = Date.now();
      await db.conversations.update(conversationId, {
        updatedAt: now,
        syncStatus: 'pending',
        vector: { [localDeviceId]: now }
      });
    } catch (error) {
      console.error('Failed to update conversation timestamp:', error);
    }
  }

  private async addToSyncQueue(
    operation: SyncItem['operation'],
    entityType: SyncItem['entityType'],
    entity: any
  ) {
    try {
      await db.syncQueue.add({
        entityType,
        operation,
        entityId: entity.id,
        payload: entity,
        status: 'pending',
        timestamp: Date.now(),
        retries: 0
      });
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  private updateCacheOrder(conversationId: string) {
    const index = this.cacheOrder.indexOf(conversationId);
    if (index > -1) this.cacheOrder.splice(index, 1);
    this.cacheOrder.push(conversationId);
  }

  // Clear cache for memory management
  clearCache() {
    this.cache.clear();
    this.cacheOrder = [];
  }

  // Get cached conversations count for debugging
  getCacheInfo() {
    return {
      size: this.cache.size,
      order: [...this.cacheOrder]
    };
  }
}

export const conversationManager = new ConversationManager();
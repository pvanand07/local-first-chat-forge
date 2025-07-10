import { SupabaseClient } from '@supabase/supabase-js';
import { db, localDeviceId, SyncItem, Conversation, Message } from './database';
import { supabase } from '@/integrations/supabase/client';

class SyncEngine {
  private isOnline = navigator.onLine;
  private syncInterval = 30000; // 30 seconds
  private batchSize = 25;
  private syncInProgress = false;
  private retryStrategy = [1000, 5000, 15000, 30000]; // Retry delays in ms
  private syncIntervalId: number | null = null;
  private realtimeChannel: any = null;

  constructor() {
    this.initNetworkListeners();
    this.initRealtime();
    this.startSyncLoop();
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('Network: Online');
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      console.log('Network: Offline');
      this.isOnline = false;
    });
  }

  private initRealtime() {
    this.realtimeChannel = supabase
      .channel('chat-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, payload => {
        console.log('Realtime conversation change:', payload);
        if ((payload.new as any)?.device_id !== localDeviceId) {
          this.handleRemoteConversationChange(payload);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, payload => {
        console.log('Realtime message change:', payload);
        if ((payload.new as any)?.device_id !== localDeviceId) {
          this.handleRemoteMessageChange(payload);
        }
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
  }

  private startSyncLoop() {
    // Initial sync
    if (this.isOnline) {
      this.processSyncQueue();
    }

    // Set up interval
    this.syncIntervalId = window.setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.processSyncQueue();
      }
    }, this.syncInterval);
  }

  stopSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  private async processSyncQueue() {
    if (this.syncInProgress || !this.isOnline) return;
    
    console.log('Starting sync process...');
    this.syncInProgress = true;

    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping sync');
        return;
      }

      // Push local changes
      await this.pushChanges();
      
      // Pull remote changes
      await this.pullChanges();
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async pushChanges() {
    const now = Date.now();
    
    // Get pending sync items, excluding those with future retry times
    const syncItems = await db.syncQueue
      .where('status')
      .equals('pending')
      .and(item => !item.nextRetry || item.nextRetry <= now)
      .limit(this.batchSize)
      .toArray();

    console.log(`Pushing ${syncItems.length} changes...`);

    for (const item of syncItems) {
      try {
        await db.syncQueue.update(item.id!, { status: 'processing' });
        
        switch (item.entityType) {
          case 'conversation':
            await this.syncConversation(item);
            break;
          
          case 'message':
            await this.syncMessage(item);
            break;
        }
        
        // Remove successfully synced item
        await db.syncQueue.delete(item.id!);
        
        // Update local sync status
        if (item.operation !== 'delete') {
          if (item.entityType === 'conversation') {
            await db.conversations.update(item.entityId, { syncStatus: 'synced' });
          } else {
            await db.messages.update(item.entityId, { syncStatus: 'synced' });
          }
        }
        
        console.log(`Synced ${item.entityType} ${item.entityId}`);
      } catch (error) {
        console.error(`Failed to sync ${item.entityType} ${item.entityId}:`, error);
        await this.handleSyncError(item, error);
      }
    }
  }

  private async syncConversation(item: SyncItem) {
    const conversation = item.payload;
    
    switch (item.operation) {
      case 'create':
      case 'update':
        await supabase
          .from('conversations')
          .upsert({
            id: conversation.id,
            user_id: conversation.user_id,
            title: conversation.title,
            created_at: new Date(conversation.createdAt).toISOString(),
            updated_at: new Date(conversation.updatedAt).toISOString(),
            device_id: localDeviceId,
            vector: conversation.vector,
            sync_status: 'synced'
          });
        break;
      
      case 'delete':
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversation.id);
        break;
    }
  }

  private async syncMessage(item: SyncItem) {
    const message = item.payload;
    
    switch (item.operation) {
      case 'create':
      case 'update':
        await supabase
          .from('messages')
          .upsert({
            id: message.id,
            conversation_id: message.conversation_id,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
            created_at: new Date(message.timestamp).toISOString(),
            device_id: localDeviceId,
            vector: message.vector,
            sync_status: 'synced'
          });
        break;
      
      case 'delete':
        await supabase
          .from('messages')
          .delete()
          .eq('id', message.id);
        break;
    }
  }

  private async pullChanges() {
    const lastSync = localStorage.getItem('lastSync') || '0';
    const now = Date.now();
    
    console.log(`Pulling changes since ${new Date(parseInt(lastSync)).toISOString()}...`);
    
    try {
      // Get conversations updated since last sync
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .gt('updated_at', new Date(parseInt(lastSync)).toISOString())
        .neq('device_id', localDeviceId);
      
      if (conversations?.length) {
        console.log(`Received ${conversations.length} conversation updates`);
        
        for (const conv of conversations) {
          const localConv: Conversation = {
            id: conv.id,
            title: conv.title,
            user_id: conv.user_id,
            createdAt: new Date(conv.created_at).getTime(),
            updatedAt: new Date(conv.updated_at).getTime(),
            syncStatus: 'synced',
            vector: (conv.vector as Record<string, number>) || {}
          };
          
          await this.mergeConversation(localConv);
        }
      }
      
      // Get messages created since last sync
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .gt('created_at', new Date(parseInt(lastSync)).toISOString())
        .neq('device_id', localDeviceId);
      
      if (messages?.length) {
        console.log(`Received ${messages.length} message updates`);
        
        for (const msg of messages) {
          const localMsg: Message = {
            id: msg.id,
            conversation_id: msg.conversation_id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.timestamp,
            syncStatus: 'synced',
            vector: (msg.vector as Record<string, number>) || {}
          };
          
          await this.mergeMessage(localMsg);
        }
      }
      
      // Update last sync timestamp
      localStorage.setItem('lastSync', now.toString());
      console.log('Pull completed');
    } catch (error) {
      console.error('Failed to pull changes:', error);
    }
  }

  private async mergeConversation(remote: Conversation) {
    const local = await db.conversations.get(remote.id);

    if (!local) {
      await db.conversations.add(remote);
      return;
    }

    // Use vector clocks for conflict resolution
    const winner = this.resolveConflict(local, remote);
    await db.conversations.put(winner);
  }

  private async mergeMessage(remote: Message) {
    const local = await db.messages.get(remote.id);

    if (!local) {
      await db.messages.add(remote);
      await db.addMessageToSearch(remote);
      return;
    }

    // Use vector clocks for conflict resolution
    const winner = this.resolveConflict(local, remote);
    await db.messages.put(winner);
  }

  private async handleRemoteConversationChange(payload: any) {
    if (payload.eventType === 'DELETE') {
      await db.conversations.delete(payload.old.id);
      return;
    }

    const remote = payload.new;
    const conversation: Conversation = {
      id: remote.id,
      title: remote.title,
      user_id: remote.user_id,
      createdAt: new Date(remote.created_at).getTime(),
      updatedAt: new Date(remote.updated_at).getTime(),
      syncStatus: 'synced',
      vector: remote.vector || {}
    };

    await this.mergeConversation(conversation);
  }

  private async handleRemoteMessageChange(payload: any) {
    if (payload.eventType === 'DELETE') {
      await db.messages.delete(payload.old.id);
      return;
    }

    const remote = payload.new;
    const message: Message = {
      id: remote.id,
      conversation_id: remote.conversation_id,
      role: remote.role,
      content: remote.content,
      timestamp: remote.timestamp,
      syncStatus: 'synced',
      vector: remote.vector || {}
    };

    await this.mergeMessage(message);
  }

  private resolveConflict(local: any, remote: any): any {
    // Compare vector clocks for conflict resolution
    const localMax = Math.max(...Object.values(local.vector || {}).map(v => Number(v)));
    const remoteMax = Math.max(...Object.values(remote.vector || {}).map(v => Number(v)));
    
    // Last-write-wins with tie-breaker by device ID
    if (remoteMax > localMax) return remote;
    if (localMax > remoteMax) return local;
    
    // Tie-breaker: lexicographically compare device IDs
    return localDeviceId > (remote.device_id || '') ? local : remote;
  }

  private async handleSyncError(item: SyncItem, error: any) {
    const retries = item.retries + 1;
    
    console.error(`Sync error for ${item.entityType} ${item.entityId} (attempt ${retries}):`, error);
    
    if (retries > this.retryStrategy.length) {
      console.error(`Max retries exceeded for ${item.entityType} ${item.entityId}, marking as failed`);
      await db.syncQueue.update(item.id!, { status: 'failed' });
      return;
    }
    
    // Schedule retry with exponential backoff
    const nextRetry = Date.now() + this.retryStrategy[retries - 1];
    await db.syncQueue.update(item.id!, { 
      status: 'pending',
      retries,
      nextRetry
    });
  }

  // Manual sync trigger
  async forcSync() {
    if (!this.syncInProgress) {
      await this.processSyncQueue();
    }
  }

  // Get sync status for debugging
  async getSyncStatus() {
    const pendingItems = await db.syncQueue.where('status').equals('pending').count();
    const failedItems = await db.syncQueue.where('status').equals('failed').count();
    
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingItems,
      failedItems,
      lastSync: localStorage.getItem('lastSync')
    };
  }
}

export const syncEngine = new SyncEngine();
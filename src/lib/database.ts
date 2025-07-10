import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import MiniSearch from 'minisearch';

// Device ID for conflict resolution
const localDeviceId = localStorage.getItem('deviceId') || uuidv4();
localStorage.setItem('deviceId', localDeviceId);

// Database schema types
export interface Conversation {
  id: string;
  title: string;
  user_id?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  vector: Record<string, number>; // Vector clock for conflict resolution
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
  vector: Record<string, number>;
}

export interface SyncItem {
  id?: number;
  entityType: 'conversation' | 'message';
  operation: 'create' | 'update' | 'delete';
  entityId: string;
  payload?: any;
  status: 'pending' | 'processing' | 'failed';
  timestamp: number;
  retries: number;
  nextRetry?: number;
}

export interface SearchIndexItem {
  id: string;
  conversation_id: string;
  tokens: string[];
}

// IndexedDB Database with Dexie
class ChatDatabase extends Dexie {
  conversations!: Dexie.Table<Conversation, string>;
  messages!: Dexie.Table<Message, string>;
  syncQueue!: Dexie.Table<SyncItem, number>;
  searchIndex!: Dexie.Table<SearchIndexItem, string>;
  
  private searchEngine: MiniSearch;

  constructor() {
    super('ChatbotDB');
    
    this.version(2).stores({
      conversations: 'id, updatedAt, syncStatus, user_id',
      messages: 'id, conversation_id, timestamp, syncStatus, [conversation_id+timestamp]',
      syncQueue: '++id, entityType, status, timestamp, nextRetry',
      searchIndex: 'id, conversation_id, *tokens'
    }).upgrade(tx => {
      // Migration: Add vector clock for conflict resolution
      return Promise.all([
        tx.table('conversations').toCollection().modify(conv => {
          conv.vector = { [localDeviceId]: conv.updatedAt };
        }),
        tx.table('messages').toCollection().modify(msg => {
          msg.vector = { [localDeviceId]: msg.timestamp };
        })
      ]);
    });

    // Initialize search engine
    this.searchEngine = new MiniSearch({
      fields: ['content'],
      storeFields: ['id', 'conversation_id', 'role', 'timestamp'],
      tokenize: text => text.toLowerCase().match(/\w+/g) || [],
      processTerm: term => term.toLowerCase()
    });

    // Load existing messages into search engine on startup
    this.on('ready', () => this.loadSearchIndex());
  }

  private async loadSearchIndex() {
    try {
      const messages = await this.messages.toArray();
      const searchableMessages = messages.map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp
      }));
      
      if (searchableMessages.length > 0) {
        this.searchEngine.addAll(searchableMessages);
      }
    } catch (error) {
      console.error('Failed to load search index:', error);
    }
  }

  async addMessageToSearch(message: Message) {
    try {
      this.searchEngine.add({
        id: message.id,
        conversation_id: message.conversation_id,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp
      });

      // Store in IndexedDB for persistence
      await this.searchIndex.put({
        id: message.id,
        conversation_id: message.conversation_id,
        tokens: this.tokenize(message.content)
      });
    } catch (error) {
      console.error('Failed to add message to search:', error);
    }
  }

  async searchMessages(query: string, conversationId?: string): Promise<Array<{
    message: Message;
    score: number;
    highlights: string;
  }>> {
    try {
      const results = this.searchEngine.search(query, {
        filter: result => conversationId 
          ? result.conversation_id === conversationId 
          : true,
        boost: { timestamp: 2 }, // Boost recent messages
        fuzzy: 0.2,
        prefix: true
      });

      // Hydrate with full message content
      const messageIds = results.map(r => r.id);
      const messages = await this.messages.bulkGet(messageIds);

      return results.map((result, i) => ({
        message: messages[i]!,
        score: result.score,
        highlights: this.highlightTerms(messages[i]!.content, query)
      })).filter(item => item.message); // Filter out any null messages
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  private tokenize(content: string): string[] {
    return content.toLowerCase().match(/\w+/g) || [];
  }

  private highlightTerms(content: string, query: string): string {
    const terms = query.toLowerCase().split(/\s+/);
    let highlighted = content;
    
    terms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      highlighted = highlighted.replace(
        regex, 
        '<mark class="search-highlight">$1</mark>'
      );
    });
    
    return highlighted;
  }
}

// Export singleton instance
export const db = new ChatDatabase();
export { localDeviceId };
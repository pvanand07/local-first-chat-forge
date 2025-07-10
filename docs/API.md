# API Documentation

This document provides comprehensive API documentation for all services and interfaces in the Local-First Chat Forge application.

## 📋 Table of Contents

1. [Conversation Manager API](#conversation-manager-api)
2. [AI Service API](#ai-service-api)
3. [Database API](#database-api)
4. [Sync Engine API](#sync-engine-api)
5. [Search API](#search-api)
6. [Type Definitions](#type-definitions)

## 🗣️ Conversation Manager API

The Conversation Manager handles high-level business operations for conversations and messages.

### Interface: `ConversationManager`

```typescript
class ConversationManager {
  // Conversation Operations
  createConversation(title?: string): Promise<Conversation>;
  getConversations(): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<Conversation | undefined>;
  updateConversationTitle(conversationId: string, title: string): Promise<void>;
  deleteConversation(conversationId: string): Promise<void>;
  
  // Message Operations
  getMessages(conversationId: string): Promise<Message[]>;
  sendMessage(
    conversationId: string, 
    content: string,
    onAIToken: (token: string) => void,
    apiKey?: string
  ): Promise<{ userMessage: Message; aiMessage: Message }>;
  
  // Cache Management
  clearCache(): void;
  getCacheInfo(): { size: number; maxSize: number; conversations: string[] };
}
```

### Methods

#### `createConversation(title?: string): Promise<Conversation>`

Creates a new conversation with an optional title.

**Parameters:**
- `title` (optional): Initial conversation title. Defaults to "New Conversation"

**Returns:** Promise resolving to the created Conversation object

**Example:**
```typescript
const conversation = await conversationManager.createConversation("My Chat");
console.log(conversation.id); // UUID of new conversation
```

---

#### `getConversations(): Promise<Conversation[]>`

Retrieves all conversations for the current user, ordered by most recent activity.

**Returns:** Promise resolving to array of Conversation objects (max 50 conversations)

**Example:**
```typescript
const conversations = await conversationManager.getConversations();
conversations.forEach(conv => console.log(conv.title, conv.updatedAt));
```

---

#### `sendMessage(conversationId, content, onAIToken, apiKey?): Promise<{userMessage, aiMessage}>`

Sends a user message and generates an AI response with real-time streaming.

**Parameters:**
- `conversationId`: Target conversation ID
- `content`: Message content from user
- `onAIToken`: Callback function called for each AI response token
- `apiKey` (optional): Override OpenRouter API key

**Returns:** Promise resolving to both user and AI messages

**Example:**
```typescript
const { userMessage, aiMessage } = await conversationManager.sendMessage(
  "conv-123",
  "Hello, how are you?",
  (token) => console.log("AI token:", token),
  "optional-api-key"
);
```

---

## 🤖 AI Service API

The AI Service handles response generation and caching for AI interactions.

### Interface: `AIService`

```typescript
class AIService {
  generateResponse(
    messages: ChatMessage[],
    conversationId: string,
    onChunk: (chunk: string) => void,
    apiKey?: string
  ): Promise<Message>;
  
  clearCache(): void;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

### Methods

#### `generateResponse(messages, conversationId, onChunk, apiKey?): Promise<Message>`

Generates an AI response using OpenRouter API with streaming support.

**Parameters:**
- `messages`: Array of conversation history for context
- `conversationId`: Target conversation ID
- `onChunk`: Callback for real-time token streaming
- `apiKey` (optional): OpenRouter API key override

**Returns:** Promise resolving to the complete AI message

**Features:**
- ✅ Streaming response with real-time tokens
- ✅ Response caching with LRU eviction
- ✅ Error handling with fallback messages
- ✅ Request timeout (30 seconds)
- ✅ Retry logic for network failures

**Example:**
```typescript
const aiMessage = await aiService.generateResponse(
  [
    { role: 'user', content: 'What is TypeScript?' },
    { role: 'assistant', content: 'TypeScript is...' },
    { role: 'user', content: 'Give me an example' }
  ],
  'conversation-id',
  (token) => updateUI(token)
);
```

**Error Handling:**
- Network timeouts return timeout error message
- Invalid API keys return authentication error
- Rate limits return rate limit error message
- Other errors return generic error message

---

## 🗄️ Database API

The Database service provides local storage operations using IndexedDB.

### Interface: `ChatDatabase`

```typescript
class ChatDatabase extends Dexie {
  conversations: Dexie.Table<Conversation, string>;
  messages: Dexie.Table<Message, string>;
  syncQueue: Dexie.Table<SyncItem, number>;
  searchIndex: Dexie.Table<SearchIndexItem, string>;
  
  // Search Operations
  addMessageToSearch(message: Message): Promise<void>;
  searchMessages(query: string, conversationId?: string): Promise<SearchResult[]>;
}
```

### Core Tables

#### Conversations Table
```typescript
// Schema
conversations: 'id, updatedAt, syncStatus, user_id'

// Operations
await db.conversations.add(conversation);
await db.conversations.get(conversationId);
await db.conversations.update(conversationId, changes);
await db.conversations.delete(conversationId);
await db.conversations.orderBy('updatedAt').reverse().toArray();
```

#### Messages Table
```typescript
// Schema  
messages: 'id, conversation_id, timestamp, syncStatus, [conversation_id+timestamp]'

// Operations
await db.messages.add(message);
await db.messages.where('conversation_id').equals(conversationId).sortBy('timestamp');
await db.messages.bulkGet(messageIds);
```

#### Sync Queue Table
```typescript
// Schema
syncQueue: '++id, entityType, status, timestamp, nextRetry'

// Operations
await db.syncQueue.add(syncItem);
await db.syncQueue.where('status').equals('pending').toArray();
await db.syncQueue.update(itemId, { status: 'processing' });
await db.syncQueue.delete(itemId);
```

### Search Methods

#### `addMessageToSearch(message: Message): Promise<void>`

Adds a message to the search index for full-text search.

**Parameters:**
- `message`: Message object to index

**Example:**
```typescript
await db.addMessageToSearch({
  id: 'msg-123',
  conversation_id: 'conv-123',
  content: 'This is a searchable message',
  role: 'user',
  timestamp: Date.now(),
  // ... other fields
});
```

---

#### `searchMessages(query, conversationId?): Promise<SearchResult[]>`

Performs full-text search across message content.

**Parameters:**
- `query`: Search query string
- `conversationId` (optional): Limit search to specific conversation

**Returns:** Array of search results with relevance scoring and highlighting

**Example:**
```typescript
const results = await db.searchMessages("TypeScript examples", "conv-123");
results.forEach(result => {
  console.log(result.message.content);
  console.log("Score:", result.score);
  console.log("Highlights:", result.highlights);
});
```

---

## 🔄 Sync Engine API

The Sync Engine manages cloud synchronization and conflict resolution.

### Interface: `SyncEngine`

```typescript
class SyncEngine {
  // Sync Operations
  processSyncQueue(): Promise<void>;
  forceSync(): Promise<void>;
  stopSync(): void;
  
  // Status and Monitoring
  getSyncStatus(): Promise<SyncStatus>;
  
  // Event Handlers (private)
  private handleRemoteConversationChange(payload: any): Promise<void>;
  private handleRemoteMessageChange(payload: any): Promise<void>;
}
```

### Methods

#### `processSyncQueue(): Promise<void>`

Processes pending sync items in the queue, uploading local changes to cloud.

**Features:**
- ✅ Batch processing (25 items per batch)
- ✅ Retry logic with exponential backoff
- ✅ Network awareness
- ✅ Automatic conflict resolution

**Example:**
```typescript
await syncEngine.processSyncQueue();
```

---

#### `getSyncStatus(): Promise<SyncStatus>`

Returns current synchronization status and statistics.

**Returns:** SyncStatus object with current state

```typescript
interface SyncStatus {
  isOnline: boolean;
  pendingSync: number;
  failedSync: number;
  lastSync?: number;
  cacheSize: any;
}

const status = await syncEngine.getSyncStatus();
console.log(`Online: ${status.isOnline}, Pending: ${status.pendingSync}`);
```

---

#### `forceSync(): Promise<void>`

Forces immediate synchronization regardless of schedule.

**Use Cases:**
- Manual sync button
- Testing synchronization
- Recovery from sync errors

**Example:**
```typescript
// Force sync on user action
await syncEngine.forceSync();
```

---

## 🔍 Search API

Search functionality is integrated into the Database API but provides specialized methods.

### Search Features

#### Full-Text Search
```typescript
// Search all messages
const results = await db.searchMessages("machine learning");

// Search within conversation
const results = await db.searchMessages("API design", "conv-123");
```

#### Search Configuration
```typescript
const searchEngine = new MiniSearch({
  fields: ['content'],                    // Fields to search
  storeFields: ['id', 'conversation_id', 'role', 'timestamp'], // Fields to return
  tokenize: text => text.toLowerCase().match(/\w+/g) || [],    // Tokenization
  processTerm: term => term.toLowerCase(),                      // Term processing
  boost: { timestamp: 2 },                                    // Boost recent messages
  fuzzy: 0.2,                                                 // Fuzzy matching
  prefix: true                                                // Prefix matching
});
```

#### Search Result Interface
```typescript
interface SearchResult {
  message: Message;      // Full message object
  score: number;         // Relevance score (0-1)
  highlights: string;    // HTML with highlighted terms
}
```

---

## 📊 Type Definitions

### Core Data Types

#### Conversation
```typescript
interface Conversation {
  id: string;                                    // UUID primary key
  title: string;                                 // Display title
  user_id?: string;                             // Owner user ID
  createdAt: number;                            // Creation timestamp (ms)
  updatedAt: number;                            // Last update timestamp (ms)
  syncStatus: 'synced' | 'pending' | 'conflict'; // Sync state
  vector: Record<string, number>;               // Vector clock for conflict resolution
}
```

#### Message
```typescript
interface Message {
  id: string;                                    // UUID primary key
  conversation_id: string;                       // Parent conversation ID
  role: 'user' | 'assistant';                  // Message sender type
  content: string;                              // Message text content
  timestamp: number;                            // Message timestamp (ms)
  syncStatus: 'synced' | 'pending' | 'conflict'; // Sync state
  vector: Record<string, number>;               // Vector clock
}
```

#### SyncItem
```typescript
interface SyncItem {
  id?: number;                                  // Auto-increment primary key
  entityType: 'conversation' | 'message';      // Type of entity to sync
  operation: 'create' | 'update' | 'delete';   // Operation type
  entityId: string;                             // ID of entity to sync
  payload?: any;                                // Entity data (for create/update)
  status: 'pending' | 'processing' | 'failed'; // Current status
  timestamp: number;                            // When queued (ms)
  retries: number;                              // Retry attempt count
  nextRetry?: number;                           // Next retry timestamp (ms)
}
```

### Response Types

#### AI Chat Message
```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

#### Search Result
```typescript
interface SearchResult {
  message: Message;
  score: number;
  highlights: string;
}
```

#### Sync Status
```typescript
interface SyncStatus {
  isOnline: boolean;
  pendingSync: number;
  failedSync: number;
  lastSync?: number;
  cacheSize: {
    size: number;
    maxSize: number;
    conversations: string[];
  };
}
```

---

## 🔧 Error Handling

### Error Types

All API methods use consistent error handling patterns:

#### Network Errors
```typescript
try {
  await conversationManager.sendMessage(id, content, onToken);
} catch (error) {
  if (error.name === 'NetworkError') {
    // Handle offline state
    showOfflineMessage();
  }
}
```

#### Validation Errors
```typescript
try {
  await conversationManager.createConversation('');
} catch (error) {
  if (error.name === 'ValidationError') {
    // Handle invalid input
    showValidationError(error.message);
  }
}
```

#### Sync Conflicts
```typescript
// Conflicts are resolved automatically by the sync engine
// Check sync status for conflict indicators
const status = await syncEngine.getSyncStatus();
if (status.failedSync > 0) {
  // Some items failed to sync
  await syncEngine.forceSync(); // Retry
}
```

---

## 🚀 Usage Examples

### Complete Chat Flow
```typescript
// 1. Create conversation
const conversation = await conversationManager.createConversation("AI Chat");

// 2. Send message with streaming
const { userMessage, aiMessage } = await conversationManager.sendMessage(
  conversation.id,
  "Explain quantum computing",
  (token) => {
    // Update UI with streaming tokens
    appendToMessage(token);
  }
);

// 3. Search messages
const searchResults = await db.searchMessages("quantum", conversation.id);

// 4. Check sync status
const syncStatus = await syncEngine.getSyncStatus();
console.log(`Sync status: ${syncStatus.isOnline ? 'Online' : 'Offline'}`);
```

### Offline Handling
```typescript
// App works seamlessly offline
window.addEventListener('offline', () => {
  console.log('App working offline - changes will sync when online');
});

window.addEventListener('online', () => {
  console.log('Back online - syncing changes...');
  syncEngine.processSyncQueue();
});
```

This API provides a robust foundation for building local-first chat applications with real-time AI integration and reliable offline functionality. 
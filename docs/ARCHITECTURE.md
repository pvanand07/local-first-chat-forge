# Architecture Guide

This document provides a comprehensive overview of the Local-First Chat Forge architecture, including system design, data flow, and component interactions.

## 🏗️ System Overview

The application follows a **local-first architecture** with the following key principles:

1. **Local data as the primary source of truth**
2. **Immediate UI updates from local storage**
3. **Background synchronization with conflict resolution**
4. **Offline-first operation with online enhancement**

## 📊 High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Application"
        UI[React UI Components]
        State[React State & Hooks]
        CM[Conversation Manager]
        AI[AI Service]
    end
    
    subgraph "Local Storage Layer"
        IDB[(IndexedDB<br/>via Dexie)]
        Search[MiniSearch<br/>Full-text Search]
        Cache[Response Cache]
    end
    
    subgraph "Synchronization Layer"
        SyncEngine[Sync Engine]
        Queue[Sync Queue]
        Conflict[Conflict Resolution]
    end
    
    subgraph "External Services"
        Supabase[(Supabase<br/>PostgreSQL)]
        Realtime[Supabase Realtime]
        OpenRouter[OpenRouter API<br/>AI Models]
    end
    
    UI --> State
    State --> CM
    CM --> IDB
    CM --> AI
    AI --> OpenRouter
    AI --> Cache
    
    IDB --> Search
    CM --> SyncEngine
    SyncEngine --> Queue
    SyncEngine --> Conflict
    SyncEngine --> Supabase
    Supabase --> Realtime
    Realtime --> SyncEngine
    
    style UI fill:#e1f5fe
    style IDB fill:#f3e5f5
    style Supabase fill:#e8f5e8
    style OpenRouter fill:#fff3e0
```

## 🔄 Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant ConvManager as Conversation Manager
    participant DB as Local Database
    participant SyncEngine as Sync Engine
    participant Supabase
    participant AI as AI Service
    participant OpenRouter
    
    User->>UI: Send Message
    UI->>ConvManager: sendMessage()
    
    Note over ConvManager: Create user message
    ConvManager->>DB: Add user message
    DB-->>UI: Immediate update
    ConvManager->>SyncEngine: Queue for sync
    
    Note over ConvManager: Generate AI response
    ConvManager->>AI: generateResponse()
    AI->>OpenRouter: Stream request
    OpenRouter-->>AI: Streaming tokens
    AI-->>UI: Real-time tokens
    
    Note over AI: Complete response
    AI->>DB: Add AI message
    DB-->>UI: Final update
    ConvManager->>SyncEngine: Queue for sync
    
    Note over SyncEngine: Background sync
    SyncEngine->>Supabase: Push changes
    Supabase-->>SyncEngine: Confirm sync
    SyncEngine->>DB: Update sync status
```

## 📁 Layer Architecture

### 1. Presentation Layer
**Location**: `src/components/`

- **React Components**: UI components built with shadcn-ui
- **State Management**: React hooks and context
- **Real-time Updates**: Live UI updates from local data

```mermaid
graph LR
    subgraph "Presentation Layer"
        ChatInterface[Chat Interface]
        Sidebar[Conversation Sidebar]
        MessageList[Message List]
        ChatInput[Chat Input]
        MessageItem[Message Item]
    end
    
    ChatInterface --> Sidebar
    ChatInterface --> MessageList
    ChatInterface --> ChatInput
    MessageList --> MessageItem
    
    style ChatInterface fill:#e3f2fd
    style Sidebar fill:#e8f5e8
    style MessageList fill:#fff3e0
    style ChatInput fill:#f3e5f5
```

### 2. Business Logic Layer
**Location**: `src/lib/`

- **Conversation Manager**: High-level business operations
- **AI Service**: AI response generation and caching
- **Database**: Local storage and search functionality
- **Sync Engine**: Cloud synchronization with conflict resolution

```mermaid
graph TB
    subgraph "Business Logic Layer"
        ConvManager[Conversation Manager<br/>• Create/update conversations<br/>• Message handling<br/>• Cache management]
        
        AIService[AI Service<br/>• Response generation<br/>• Streaming support<br/>• Response caching<br/>• Error handling]
        
        Database[Database Layer<br/>• IndexedDB operations<br/>• Full-text search<br/>• Data modeling<br/>• Search indexing]
        
        SyncEngine[Sync Engine<br/>• Background synchronization<br/>• Conflict resolution<br/>• Retry mechanisms<br/>• Network handling]
    end
    
    ConvManager --> Database
    ConvManager --> AIService
    ConvManager --> SyncEngine
    SyncEngine --> Database
    
    style ConvManager fill:#e1f5fe
    style AIService fill:#fff3e0
    style Database fill:#f3e5f5
    style SyncEngine fill:#e8f5e8
```

### 3. Data Layer

#### Local Storage Schema

```mermaid
erDiagram
    Conversation {
        string id PK
        string title
        string user_id FK
        number createdAt
        number updatedAt
        string syncStatus
        object vector
    }
    
    Message {
        string id PK
        string conversation_id FK
        string role
        string content
        number timestamp
        string syncStatus
        object vector
    }
    
    SyncItem {
        number id PK
        string entityType
        string operation
        string entityId
        object payload
        string status
        number timestamp
        number retries
        number nextRetry
    }
    
    SearchIndexItem {
        string id PK
        string conversation_id FK
        array tokens
    }
    
    Conversation ||--o{ Message : "has many"
    Conversation ||--o{ SearchIndexItem : "indexed by"
    Message ||--|| SearchIndexItem : "creates"
```

#### Cloud Storage Schema (Supabase)

```mermaid
erDiagram
    conversations {
        uuid id PK
        uuid user_id FK
        text title
        timestamptz created_at
        timestamptz updated_at
        text device_id
        jsonb vector
        text sync_status
    }
    
    messages {
        uuid id PK
        uuid conversation_id FK
        text role
        text content
        bigint timestamp
        timestamptz created_at
        text device_id
        jsonb vector
        text sync_status
    }
    
    conversations ||--o{ messages : "contains"
```

## 🔄 Synchronization Architecture

### Sync Strategy

```mermaid
stateDiagram-v2
    [*] --> Offline
    Offline --> Online : Network Available
    Online --> Syncing : Has Pending Changes
    Online --> Idle : No Changes
    Syncing --> Online : Sync Complete
    Syncing --> Conflict : Conflict Detected
    Conflict --> Syncing : Conflict Resolved
    Online --> Offline : Network Lost
    Idle --> Syncing : New Changes
    
    note right of Conflict
        Vector clock-based
        conflict resolution
    end note
```

### Conflict Resolution Flow

```mermaid
flowchart TD
    Start([Conflict Detected]) --> Compare{Compare Vector Clocks}
    
    Compare -->|Local Newer| UseLocal[Use Local Version]
    Compare -->|Remote Newer| UseRemote[Use Remote Version]
    Compare -->|Concurrent| LastWrite[Last-Write-Wins<br/>with Device Priority]
    
    UseLocal --> UpdateRemote[Update Remote]
    UseRemote --> UpdateLocal[Update Local]
    LastWrite --> Merge[Merge Changes]
    
    UpdateRemote --> Complete([Conflict Resolved])
    UpdateLocal --> Complete
    Merge --> Complete
    
    style Start fill:#ffcdd2
    style Complete fill:#c8e6c9
    style Compare fill:#fff3e0
```

## 🤖 AI Integration Architecture

### AI Response Flow

```mermaid
sequenceDiagram
    participant UI
    participant AIService
    participant Cache
    participant OpenRouter
    participant Stream
    
    UI->>AIService: generateResponse(messages)
    AIService->>Cache: Check cache
    
    alt Cache Hit
        Cache-->>AIService: Cached response
        AIService->>UI: Simulate streaming
    else Cache Miss
        AIService->>OpenRouter: API request
        OpenRouter->>Stream: Initialize stream
        
        loop Streaming
            Stream-->>AIService: Token chunk
            AIService-->>UI: Real-time token
        end
        
        Stream-->>AIService: Complete response
        AIService->>Cache: Store response
    end
    
    AIService-->>UI: Final message
```

### AI Service Architecture

```mermaid
graph TB
    subgraph "AI Service"
        RequestHandler[Request Handler<br/>• Message formatting<br/>• API key management<br/>• Error handling]
        
        StreamProcessor[Stream Processor<br/>• Token parsing<br/>• Real-time updates<br/>• Completion detection]
        
        CacheManager[Cache Manager<br/>• Response caching<br/>• LRU eviction<br/>• Cache invalidation]
        
        ErrorHandler[Error Handler<br/>• Retry logic<br/>• Timeout handling<br/>• Fallback responses]
    end
    
    RequestHandler --> StreamProcessor
    RequestHandler --> CacheManager
    RequestHandler --> ErrorHandler
    StreamProcessor --> CacheManager
    
    style RequestHandler fill:#e3f2fd
    style StreamProcessor fill:#e8f5e8
    style CacheManager fill:#fff3e0
    style ErrorHandler fill:#ffebee
```

## 🔍 Search Architecture

### Full-Text Search Implementation

```mermaid
graph LR
    subgraph "Search System"
        Input[User Query] --> Tokenizer[Tokenizer<br/>• Word extraction<br/>• Normalization<br/>• Stop words]
        
        Tokenizer --> SearchEngine[MiniSearch Engine<br/>• Fuzzy matching<br/>• Prefix search<br/>• Scoring]
        
        SearchEngine --> Results[Results<br/>• Relevance scoring<br/>• Highlighting<br/>• Pagination]
        
        subgraph "Index"
            MessageIndex[Message Index<br/>• Content tokens<br/>• Conversation mapping<br/>• Metadata]
        end
        
        SearchEngine <--> MessageIndex
    end
    
    style Input fill:#e1f5fe
    style SearchEngine fill:#e8f5e8
    style Results fill:#fff3e0
    style MessageIndex fill:#f3e5f5
```

## 🔧 Component Interaction Patterns

### State Management Pattern

```mermaid
graph TB
    subgraph "State Flow"
        UserAction[User Action] --> Component[React Component]
        Component --> Manager[Service Manager]
        Manager --> LocalDB[(Local Database)]
        LocalDB --> Component
        Component --> UI[UI Update]
        
        Manager --> SyncQueue[Sync Queue]
        SyncQueue --> CloudSync[Cloud Sync]
        CloudSync --> Realtime[Realtime Updates]
        Realtime --> Manager
    end
    
    style UserAction fill:#e3f2fd
    style LocalDB fill:#f3e5f5
    style CloudSync fill:#e8f5e8
    style UI fill:#fff3e0
```

### Error Handling Strategy

```mermaid
flowchart TD
    Error[Error Occurs] --> Type{Error Type}
    
    Type -->|Network| NetworkHandler[Network Error Handler<br/>• Queue for retry<br/>• Show offline mode<br/>• Continue locally]
    
    Type -->|AI API| AIHandler[AI Error Handler<br/>• Retry with backoff<br/>• Fallback response<br/>• User notification]
    
    Type -->|Database| DBHandler[Database Error Handler<br/>• Transaction rollback<br/>• Data recovery<br/>• Cache invalidation]
    
    Type -->|Sync| SyncHandler[Sync Error Handler<br/>• Conflict resolution<br/>• Manual intervention<br/>• Data integrity check]
    
    NetworkHandler --> Recover[Attempt Recovery]
    AIHandler --> Recover
    DBHandler --> Recover
    SyncHandler --> Recover
    
    Recover --> Success{Success?}
    Success -->|Yes| Continue[Continue Operation]
    Success -->|No| UserNotify[Notify User]
    
    style Error fill:#ffcdd2
    style Recover fill:#fff3e0
    style Continue fill:#c8e6c9
    style UserNotify fill:#ffe0b2
```

## 📱 Responsive Design Architecture

The UI adapts to different screen sizes using a responsive sidebar pattern:

```mermaid
graph LR
    subgraph "Desktop Layout"
        DSidebar[Sidebar<br/>Always Visible]
        DMain[Main Chat<br/>Full Width]
    end
    
    subgraph "Mobile Layout"
        MDrawer[Drawer Sidebar<br/>Overlay]
        MMain[Main Chat<br/>Full Screen]
    end
    
    BreakPoint{Screen Size} -->|≥768px| DSidebar
    BreakPoint -->|<768px| MDrawer
    
    style DSidebar fill:#e3f2fd
    style DMain fill:#e8f5e8
    style MDrawer fill:#fff3e0
    style MMain fill:#f3e5f5
```

## 🔐 Security Architecture

### Data Protection Layers

```mermaid
graph TB
    subgraph "Security Layers"
        Frontend[Frontend Security<br/>• Input validation<br/>• XSS prevention<br/>• Content sanitization]
        
        API[API Security<br/>• Authentication<br/>• Rate limiting<br/>• Request validation]
        
        Database[Database Security<br/>• Row Level Security<br/>• User isolation<br/>• Data encryption]
        
        Network[Network Security<br/>• HTTPS only<br/>• CORS policies<br/>• API key protection]
    end
    
    Frontend --> API
    API --> Database
    Frontend --> Network
    
    style Frontend fill:#e3f2fd
    style API fill:#e8f5e8
    style Database fill:#f3e5f5
    style Network fill:#fff3e0
```

## 📈 Performance Considerations

### Optimization Strategies

1. **Local-First**: Immediate UI updates from local storage
2. **Caching**: Multiple cache layers for different data types
3. **Lazy Loading**: Components and data loaded on demand
4. **Search Indexing**: Pre-built search indices for fast queries
5. **Background Sync**: Non-blocking synchronization
6. **Virtual Scrolling**: Efficient rendering of large message lists

### Memory Management

```mermaid
graph TB
    subgraph "Cache Strategy"
        L1[L1: React State<br/>Current conversation]
        L2[L2: Service Cache<br/>Recent conversations]
        L3[L3: IndexedDB<br/>All local data]
        L4[L4: Supabase<br/>Cloud backup]
    end
    
    L1 --> L2
    L2 --> L3
    L3 --> L4
    
    style L1 fill:#ffebee
    style L2 fill:#fff3e0
    style L3 fill:#e8f5e8
    style L4 fill:#e3f2fd
```

This architecture provides a robust, scalable foundation for a local-first chat application with real-time synchronization and AI integration. 
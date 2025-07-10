# Local-First Chat Forge

A modern, local-first chat application built with React, TypeScript, and Supabase that provides seamless offline capabilities with real-time synchronization.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for cloud sync)
- OpenRouter API key (for AI responses)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd local-first-chat-forge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and OpenRouter credentials

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENROUTER_API_KEY=your-openrouter-api-key
```

## 🏗️ Architecture Overview

This application implements a **local-first architecture** where:

- **Data lives locally** in IndexedDB using Dexie
- **Works offline** with full functionality
- **Syncs when online** with conflict resolution
- **Real-time updates** via Supabase realtime
- **AI integration** through OpenRouter API

## 📚 Documentation Structure

- **[Architecture Guide](./ARCHITECTURE.md)** - System design and data flow
- **[Local-First Implementation](./LOCAL_FIRST.md)** - Offline-first strategies
- **[API Documentation](./API.md)** - Service interfaces and methods
- **[Component Guide](./COMPONENTS.md)** - UI component structure
- **[Development Guide](./DEVELOPMENT.md)** - Development workflow
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment

## ✨ Key Features

### 🔄 Local-First Architecture
- **Offline-first**: Full functionality without internet connection
- **Real-time sync**: Automatic synchronization when online
- **Conflict resolution**: Vector clock-based conflict handling
- **Data persistence**: Local IndexedDB storage with search indexing

### 🤖 AI Integration  
- **Streaming responses**: Real-time AI response streaming
- **Context awareness**: Conversation history management
- **Multiple models**: OpenRouter API integration
- **Caching**: Response caching for performance

### 🔍 Advanced Features
- **Full-text search**: Message content search with highlighting
- **Conversation management**: Create, rename, delete conversations
- **Responsive UI**: Modern design with shadcn-ui components
- **Type safety**: Full TypeScript implementation

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn-ui** - UI component library
- **Lucide React** - Icons

### Data & Storage
- **Dexie** - IndexedDB wrapper for local storage
- **Supabase** - Backend as a service for cloud sync
- **MiniSearch** - Full-text search engine
- **Tanstack Query** - Server state management

### AI & APIs
- **OpenRouter** - AI model access
- **Streaming API** - Real-time response streaming

## 📖 Core Concepts

### Local-First Principles
1. **Fast**: Local data access for instant interactions
2. **Reliable**: Works offline and handles network issues gracefully  
3. **Private**: Data stored locally by default
4. **Collaborative**: Multi-device sync with conflict resolution

### Data Flow
1. User interacts with UI
2. Changes written to local IndexedDB immediately
3. UI updates instantly from local data
4. Changes queued for sync when online
5. Background sync resolves conflicts and updates cloud

### Conflict Resolution
Uses vector clocks to handle concurrent edits across devices:
- Each device maintains a logical clock
- Changes include vector timestamps
- Conflicts resolved using "last-write-wins" with device precedence

## 🎯 Getting Started for LLMs

This project is designed to be LLM-friendly with:

- **Clear separation of concerns** - distinct layers for UI, data, sync, and AI
- **Comprehensive TypeScript types** - full type safety and IntelliSense
- **Modular architecture** - easy to understand and modify individual components
- **Detailed documentation** - each major system documented with examples
- **Consistent patterns** - standardized approaches across the codebase

### Key Entry Points for Modifications

1. **UI Components**: `src/components/chat/` - React components for chat interface
2. **Data Layer**: `src/lib/database.ts` - Local storage and search
3. **Sync Engine**: `src/lib/sync-engine.ts` - Cloud synchronization logic
4. **AI Service**: `src/lib/ai-service.ts` - AI response generation
5. **Conversation Management**: `src/lib/conversation-manager.ts` - Business logic

### Common Development Tasks

- **Add new UI features**: Modify components in `src/components/`
- **Change data model**: Update `src/lib/database.ts` and migration scripts
- **Modify sync behavior**: Edit `src/lib/sync-engine.ts`
- **Integrate new AI models**: Update `src/lib/ai-service.ts`
- **Add new pages**: Create components in `src/pages/`

## 📦 Project Structure

```
src/
├── components/          # React components
│   ├── chat/           # Chat-specific components
│   └── ui/             # Reusable UI components
├── lib/                # Core business logic
│   ├── database.ts     # Local storage layer
│   ├── sync-engine.ts  # Cloud synchronization
│   ├── ai-service.ts   # AI integration
│   └── conversation-manager.ts # Business logic
├── pages/              # Route components
├── hooks/              # Custom React hooks
└── integrations/       # External service integrations
    └── supabase/       # Supabase configuration
```

## 🤝 Contributing

1. Read the [Development Guide](./DEVELOPMENT.md)
2. Check the [Architecture Documentation](./ARCHITECTURE.md) 
3. Review the [Component Guide](./COMPONENTS.md)
4. Make your changes following established patterns
5. Test both online and offline functionality

## 📄 License

This project is licensed under the MIT License. 
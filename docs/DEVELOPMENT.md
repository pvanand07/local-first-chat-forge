# Development Guide

This guide provides comprehensive instructions for setting up the development environment, understanding the codebase, and contributing to the Local-First Chat Forge project.

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js 18+** (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- **npm** or **yarn** or **pnpm** 
- **Git**
- **Code Editor** (VS Code recommended with extensions)

### Initial Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd local-first-chat-forge

# 2. Install dependencies
npm install
# or
yarn install
# or 
pnpm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Configure environment variables (see Environment Setup section)

# 5. Start development server
npm run dev
```

## ⚙️ Environment Setup

### Required Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Service Configuration  
VITE_OPENROUTER_API_KEY=your-openrouter-api-key

# Optional: Development flags
VITE_DEV_MODE=true
VITE_DEBUG_SYNC=true
```

### Supabase Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note the project URL and anon key

2. **Run Database Migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```

3. **Configure Authentication**
   - Enable email authentication in Supabase dashboard
   - Configure RLS policies (already included in migrations)

### OpenRouter Setup

1. **Get API Key**
   - Visit [openrouter.ai](https://openrouter.ai)
   - Create account and generate API key
   - Add to environment variables

2. **Model Configuration**
   - Default model: `openai/gpt-4o`
   - Configurable in `src/lib/ai-service.ts`

## 🛠️ Development Workflow

### Project Structure

```
src/
├── components/          # React components
│   ├── chat/           # Chat-specific components
│   │   ├── ChatInterface.tsx     # Main chat container
│   │   ├── ConversationSidebar.tsx # Sidebar with conversations
│   │   ├── MessageList.tsx       # Message display container
│   │   ├── MessageItem.tsx       # Individual message component
│   │   └── ChatInput.tsx         # Message input component
│   └── ui/             # Reusable UI components (shadcn-ui)
├── lib/                # Core business logic
│   ├── database.ts     # Local storage with Dexie
│   ├── sync-engine.ts  # Cloud synchronization
│   ├── ai-service.ts   # AI response generation
│   ├── conversation-manager.ts # Business logic layer
│   └── utils.ts        # Utility functions
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and types
└── styles/             # Global styles and themes
```

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Build for development (with source maps)
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit
```

### Code Style and Standards

#### TypeScript Configuration

```json
// tsconfig.json key settings
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": false,      // Allow for rapid prototyping
    "noUnusedLocals": false,     // Disable for development
    "skipLibCheck": true,        // Faster builds
    "allowJs": true              // Support JS files
  }
}
```

#### ESLint Rules

Key linting rules enforced:

- **React Hooks**: Proper dependency arrays
- **React Refresh**: Fast refresh compatibility
- **TypeScript**: Type safety where practical
- **Import Order**: Consistent import organization

#### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false
}
```

### Component Development Guidelines

#### 1. Component Structure

```typescript
// Component template
import React, { useState, useEffect, useCallback } from 'react';
import { ComponentProps } from './types';

interface ComponentNameProps {
  // Props interface
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2,
  ...props
}) => {
  // State declarations
  const [state, setState] = useState();
  
  // Event handlers (memoized)
  const handleEvent = useCallback(() => {
    // Implementation
  }, [dependencies]);
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // Render
  return (
    <div className="component-styles">
      {/* JSX */}
    </div>
  );
};

// Export with memo for performance if needed
export default React.memo(ComponentName);
```

#### 2. State Management Patterns

```typescript
// Local state for UI-specific data
const [isOpen, setIsOpen] = useState(false);
const [inputValue, setInputValue] = useState('');

// Service layer for business logic
const handleSubmit = useCallback(async () => {
  try {
    await conversationManager.createConversation(inputValue);
    setInputValue('');
    onSuccess?.();
  } catch (error) {
    toast({ title: "Error", description: error.message });
  }
}, [inputValue, onSuccess]);

// Custom hooks for reusable logic
const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadConversations = async () => {
      const data = await conversationManager.getConversations();
      setConversations(data);
      setLoading(false);
    };
    loadConversations();
  }, []);
  
  return { conversations, loading };
};
```

### Service Layer Development

#### Database Operations

```typescript
// Always use transactions for multi-table operations
await db.transaction('rw', [db.conversations, db.messages], async () => {
  await db.conversations.add(conversation);
  await db.messages.add(firstMessage);
});

// Use proper error handling
try {
  const result = await db.conversations.get(id);
  if (!result) {
    throw new Error('Conversation not found');
  }
  return result;
} catch (error) {
  console.error('Database operation failed:', error);
  throw new Error('Failed to retrieve conversation');
}
```

#### API Integration

```typescript
// Use proper TypeScript interfaces
interface APIResponse<T> {
  data: T;
  error?: string;
  status: 'success' | 'error';
}

// Implement proper error handling
const makeAPICall = async <T>(
  url: string, 
  options: RequestInit
): Promise<T> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
```

## 🧪 Testing Strategy

### Testing Framework Setup

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest jsdom

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure

```typescript
// Component test example
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  const mockOnSendMessage = vi.fn();
  
  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });
  
  it('should send message on Enter key', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    });
  });
  
  it('should not send empty messages', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });
});
```

### Service Testing

```typescript
// Service layer test example
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationManager } from './conversation-manager';
import { db } from './database';

// Mock database
vi.mock('./database', () => ({
  db: {
    conversations: {
      add: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
    },
  },
}));

describe('ConversationManager', () => {
  let manager: ConversationManager;
  
  beforeEach(() => {
    manager = new ConversationManager();
    vi.clearAllMocks();
  });
  
  it('should create conversation successfully', async () => {
    const mockConversation = { id: '123', title: 'Test' };
    vi.mocked(db.conversations.add).mockResolvedValue(mockConversation);
    
    const result = await manager.createConversation('Test');
    
    expect(db.conversations.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test' })
    );
    expect(result.title).toBe('Test');
  });
});
```

## 🔧 Debugging and Development Tools

### Browser DevTools Extensions

Install these Chrome/Firefox extensions:

- **React Developer Tools**: Component inspection
- **Redux DevTools**: State debugging (if using Redux)
- **Apollo DevTools**: GraphQL debugging (if applicable)

### Debugging Local Storage

```typescript
// Debug IndexedDB data
const debugDatabase = async () => {
  const conversations = await db.conversations.toArray();
  const messages = await db.messages.toArray();
  const syncQueue = await db.syncQueue.toArray();
  
  console.group('Database State');
  console.log('Conversations:', conversations);
  console.log('Messages:', messages);
  console.log('Sync Queue:', syncQueue);
  console.groupEnd();
};

// Add to window for console access
if (process.env.NODE_ENV === 'development') {
  (window as any).debugDB = debugDatabase;
}
```

### Network Debugging

```typescript
// Debug sync operations
const debugSync = async () => {
  const status = await syncEngine.getSyncStatus();
  console.log('Sync Status:', status);
  
  // Force sync
  await syncEngine.forceSync();
  console.log('Force sync completed');
};

// Test offline functionality
const simulateOffline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false,
  });
  window.dispatchEvent(new Event('offline'));
};

const simulateOnline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });
  window.dispatchEvent(new Event('online'));
};
```

## 🔍 Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Check for duplicate dependencies
npx duplicate-package-checker-webpack-plugin
```

### Performance Monitoring

```typescript
// Monitor component render performance
const useRenderMonitor = (componentName: string) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.time(`${componentName} render`);
      return () => {
        console.timeEnd(`${componentName} render`);
      };
    }
  });
};

// Monitor database operations
const monitorDatabaseOp = async (operation: string, fn: () => Promise<any>) => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`DB ${operation}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    console.error(`DB ${operation} failed:`, error);
    throw error;
  }
};
```

## 🤝 Contributing Guidelines

### Branching Strategy

```bash
# Feature development
git checkout -b feature/add-message-search
git commit -m "feat: add full-text message search"

# Bug fixes
git checkout -b fix/sync-conflict-resolution
git commit -m "fix: resolve vector clock conflicts"

# Documentation
git checkout -b docs/update-api-guide
git commit -m "docs: update API documentation"
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement Changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation

3. **Test Your Changes**
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

4. **Create Pull Request**
   - Use descriptive title
   - Provide detailed description
   - Link related issues
   - Include screenshots for UI changes

5. **Code Review Process**
   - Address review feedback
   - Ensure CI passes
   - Update documentation if needed

### Code Review Checklist

#### Functionality
- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] Error handling implemented
- [ ] Offline functionality maintained

#### Code Quality
- [ ] TypeScript types properly defined
- [ ] No console.log statements (use proper logging)
- [ ] Components are performant (memo, useCallback where appropriate)
- [ ] Accessibility considerations addressed

#### Testing
- [ ] Unit tests added for new functionality
- [ ] Integration tests updated if needed
- [ ] Manual testing performed

#### Documentation
- [ ] Code is self-documenting
- [ ] Complex logic has comments
- [ ] API documentation updated
- [ ] README updated if needed

## 🐛 Common Issues and Solutions

### Development Server Issues

```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev

# Check port conflicts
lsof -ti:8080
kill -9 <PID>
```

### Database Issues

```typescript
// Reset local database
const resetDatabase = async () => {
  await db.delete();
  await db.open();
  location.reload();
};

// Check database version
console.log('Database version:', db.verno);

// Manual migration
await db.version(3).stores({
  // New schema
});
```

### Sync Issues

```typescript
// Clear sync queue
await db.syncQueue.clear();

// Check network connectivity
console.log('Online:', navigator.onLine);

// Force sync with debug logging
await syncEngine.forceSync();
```

### Build Issues

```bash
# Clear build cache
rm -rf dist .vite

# Check TypeScript errors
npx tsc --noEmit

# Build with verbose output
npm run build -- --mode development
```

This development guide provides a comprehensive foundation for contributing to and extending the Local-First Chat Forge application. 
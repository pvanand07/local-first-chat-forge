import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Message } from '@/lib/database';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  streamingMessage?: Message;
  streamContent: string;
  className?: string;
}

export interface MessageListRef {
  scrollToBottom: () => void;
}

export const MessageList = forwardRef<MessageListRef, MessageListProps>(
  ({ messages, isLoading, streamingMessage, streamContent, className }, ref) => {
    const listRef = useRef<List>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      if (listRef.current) {
        const totalItems = messages.length + (isLoading ? 1 : 0);
        listRef.current.scrollToItem(Math.max(0, totalItems - 1), 'end');
      }
    };

    useImperativeHandle(ref, () => ({
      scrollToBottom
    }));

    useEffect(() => {
      scrollToBottom();
    }, [messages.length, isLoading, streamContent]);

    const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const isStreamingRow = isLoading && index === messages.length;
      const message = index < messages.length ? messages[index] : streamingMessage;

      if (!message) return null;

      return (
        <div style={style}>
          <MessageItem
            message={message}
            isStreaming={isStreamingRow}
            streamContent={isStreamingRow ? streamContent : undefined}
          />
        </div>
      );
    };

    const itemSize = 100; // Approximate height per message
    const totalItems = messages.length + (isLoading && streamingMessage ? 1 : 0);

    if (totalItems === 0) {
      return (
        <div className={`flex-1 flex items-center justify-center ${className}`}>
          <div className="text-center text-muted-foreground">
            <div className="text-lg font-medium mb-2">Start a conversation</div>
            <div className="text-sm">Send a message to begin chatting with the AI assistant.</div>
          </div>
        </div>
      );
    }

    return (
      <div ref={containerRef} className={`flex-1 ${className}`}>
        <List
          ref={listRef}
          height={containerRef.current?.clientHeight || 600}
          itemCount={totalItems}
          itemSize={itemSize}
          width="100%"
          className="chat-scroll"
        >
          {renderRow}
        </List>
      </div>
    );
  }
);
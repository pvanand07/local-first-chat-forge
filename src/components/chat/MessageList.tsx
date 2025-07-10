import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    };

    useImperativeHandle(ref, () => ({
      scrollToBottom
    }));

    useEffect(() => {
      scrollToBottom();
    }, [messages.length, isLoading, streamContent]);

    if (messages.length === 0 && !isLoading) {
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
      <div 
        ref={containerRef} 
        className={`flex-1 overflow-y-auto chat-scroll ${className}`}
      >
        <div className="flex flex-col">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
            />
          ))}
          
          {isLoading && streamingMessage && (
            <MessageItem
              message={streamingMessage}
              isStreaming={true}
              streamContent={streamContent}
            />
          )}
        </div>
      </div>
    );
  }
);
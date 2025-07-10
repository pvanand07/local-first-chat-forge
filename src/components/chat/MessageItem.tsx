import React from 'react';
import { Message } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  streamContent?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  isStreaming = false,
  streamContent = ''
}) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex gap-3 p-4 group hover:bg-muted/20 transition-colors",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 break-words",
        isUser 
          ? "message-user ml-auto"
          : "message-assistant mr-auto"
      )}>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {isStreaming && streamContent ? (
            <>
              {message.content}
              {streamContent}
              <span className="ai-cursor">▋</span>
            </>
          ) : (
            message.content
          )}
        </div>
        
        {/* Timestamp */}
        <div className={cn(
          "text-xs mt-2 opacity-70",
          isUser ? "text-right" : "text-left"
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
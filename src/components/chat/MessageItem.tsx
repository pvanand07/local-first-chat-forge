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
      "flex gap-3 md:gap-4 px-1 md:px-2 py-2 md:py-3 group transition-all duration-300",
      "hover:bg-gradient-to-r hover:from-muted/10 hover:to-transparent",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <Avatar className="h-8 md:h-9 w-8 md:w-9 shrink-0 ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40">
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <Bot className="h-3 md:h-4 w-3 md:w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[85%] md:max-w-[75%] break-words transition-all duration-300",
        isUser 
          ? "message-user ml-auto"
          : "message-assistant mr-auto"
      )}>
        <div className="text-sm md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
          {isStreaming && streamContent ? (
            <>
              {message.content}
              {streamContent}
              <span className="ai-cursor text-primary">▋</span>
            </>
          ) : (
            message.content
          )}
        </div>
        
        {/* Timestamp */}
        <div className={cn(
          "text-xs mt-2 md:mt-3 opacity-60 font-medium transition-opacity duration-300 group-hover:opacity-80",
          isUser ? "text-right text-white/80" : "text-left text-muted-foreground"
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
      
      {isUser && (
        <Avatar className="h-8 md:h-9 w-8 md:w-9 shrink-0 ring-2 ring-secondary/30 transition-all duration-300 group-hover:ring-secondary/50">
          <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground">
            <User className="h-3 md:h-4 w-3 md:w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
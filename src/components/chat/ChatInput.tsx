import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  className
}) => {
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      adjustTextareaHeight();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFocus = () => {
    if (isMobile) {
      setIsKeyboardVisible(true);
      // Small delay to ensure keyboard is fully shown
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  const handleBlur = () => {
    if (isMobile) {
      setIsKeyboardVisible(false);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // Max height equivalent to ~6 lines
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // Mobile keyboard handling
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    const handleResize = () => {
      checkMobile();
      // Detect virtual keyboard on mobile
      if (window.innerWidth < 768) {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const standardHeight = window.screen.height;
        const keyboardVisible = currentHeight < standardHeight * 0.75;
        setIsKeyboardVisible(keyboardVisible);
      }
    };

    checkMobile();
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={cn("p-0", className)}>
      <div className="chat-input-floating">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className="chat-input-textarea min-h-[3.5rem] max-h-[8rem] w-full"
            rows={1}
          />
          
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="chat-input-send-button"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        
        <div className="flex justify-between items-center px-6 pb-4 text-xs text-muted-foreground/80">
          <span className="font-medium hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
          <span className="font-medium sm:hidden text-xs">Enter to send</span>
          <span className={cn(
            "px-2 py-1 rounded-full bg-muted/30 font-medium transition-colors text-xs",
            message.length > 1800 && "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
            message.length > 1950 && "text-red-500 bg-red-50 dark:bg-red-950/30"
          )}>
            {message.length}/2000
          </span>
        </div>
      </div>
    </div>
  );
};
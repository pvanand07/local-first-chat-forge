import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Lightbulb, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewportSize } from '@/hooks/useViewportSize';
import { useToast } from '@/hooks/use-toast';

type ActiveButton = "none" | "add" | "deepSearch" | "think";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Ask anything...",
  className
}) => {
  const [inputValue, setInputValue] = useState('');
  const [hasTyped, setHasTyped] = useState(false);
  const [activeButton, setActiveButton] = useState<ActiveButton>("none");
  const { height: viewportHeight, isMobile } = useViewportSize();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const selectionStateRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });

  // Save and restore selection state
  const saveSelectionState = () => {
    if (textareaRef.current) {
      selectionStateRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  };

  const restoreSelectionState = () => {
    const textarea = textareaRef.current;
    const { start, end } = selectionStateRef.current;

    if (textarea && start !== null && end !== null) {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    } else if (textarea) {
      textarea.focus();
    }
  };

  const focusTextarea = () => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      // Add vibration feedback
      try {
        navigator.vibrate?.(50);
      } catch (e) {
        // Vibration not supported
      }

      onSendMessage(inputValue.trim());
      setInputValue('');
      setHasTyped(false);
      setActiveButton("none");
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Focus management based on device
      if (!isMobile) {
        focusTextarea();
      } else {
        if (textareaRef.current) {
          textareaRef.current.blur();
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Cmd+Enter on both mobile and desktop
    if (!disabled && e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    // Only handle regular Enter key (without Shift) on desktop
    if (!disabled && !isMobile && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // Only allow input changes when not disabled
    if (!disabled) {
      setInputValue(newValue);

      if (newValue.trim() !== "" && !hasTyped) {
        setHasTyped(true);
      } else if (newValue.trim() === "" && hasTyped) {
        setHasTyped(false);
      }

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.max(24, Math.min(textarea.scrollHeight, 160));
        textarea.style.height = `${newHeight}px`;
      }
    }
  };

  const handleInputContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only focus if clicking directly on the container, not on buttons or other interactive elements
    if (
      e.target === e.currentTarget ||
      (e.currentTarget === inputContainerRef.current && !(e.target as HTMLElement).closest("button"))
    ) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const toggleButton = (button: ActiveButton) => {
    if (!disabled) {
      // Save the current selection state before toggling
      saveSelectionState();

      setActiveButton((prev) => (prev === button ? "none" : button));

      // Restore the selection state after toggling
      setTimeout(() => {
        restoreSelectionState();
      }, 0);
    }
  };

  // Focus the textarea on component mount (only on desktop)
  useEffect(() => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  }, [isMobile]);


  return (
    <div className="p-4 bg-background">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div
          ref={inputContainerRef}
          className={cn(
            "relative w-full rounded-3xl border border-input bg-background p-3 cursor-text",
            disabled && "opacity-80",
          )}
          onClick={handleInputContainerClick}
        >
          <div className="pb-9">
            <Textarea
              ref={textareaRef}
              placeholder={disabled ? "Waiting for response..." : placeholder}
              className="min-h-[24px] max-h-[160px] w-full rounded-3xl border-0 bg-transparent text-foreground placeholder:text-muted-foreground placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 text-base pl-2 pr-4 pt-0 pb-0 resize-none overflow-y-auto leading-tight"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                // Ensure the textarea is scrolled into view when focused
                if (textareaRef.current) {
                  textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
            />
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn(
                    "rounded-full h-8 w-8 flex-shrink-0 border-input p-0 transition-colors",
                    activeButton === "add" && "bg-accent border-accent-foreground/20",
                  )}
                  onClick={() => toggleButton("add")}
                  disabled={disabled}
                >
                  <Plus className={cn("h-4 w-4 text-muted-foreground", activeButton === "add" && "text-accent-foreground")} />
                  <span className="sr-only">Add</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "rounded-full h-8 px-3 flex items-center border-input gap-1.5 transition-colors",
                    activeButton === "deepSearch" && "bg-accent border-accent-foreground/20",
                  )}
                  onClick={() => toggleButton("deepSearch")}
                  disabled={disabled}
                >
                  <Search className={cn("h-4 w-4 text-muted-foreground", activeButton === "deepSearch" && "text-accent-foreground")} />
                  <span className={cn("text-foreground text-sm", activeButton === "deepSearch" && "font-medium")}>
                    DeepSearch
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "rounded-full h-8 px-3 flex items-center border-input gap-1.5 transition-colors",
                    activeButton === "think" && "bg-accent border-accent-foreground/20",
                  )}
                  onClick={() => toggleButton("think")}
                  disabled={disabled}
                >
                  <Lightbulb className={cn("h-4 w-4 text-muted-foreground", activeButton === "think" && "text-accent-foreground")} />
                  <span className={cn("text-foreground text-sm", activeButton === "think" && "font-medium")}>
                    Think
                  </span>
                </Button>
              </div>

              <Button
                type="submit"
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full h-8 w-8 border-0 flex-shrink-0 transition-all duration-200",
                  hasTyped ? "bg-primary scale-110" : "bg-muted",
                )}
                disabled={!inputValue.trim() || disabled}
              >
                <ArrowUp className={cn("h-4 w-4 transition-colors", hasTyped ? "text-primary-foreground" : "text-muted-foreground")} />
                <span className="sr-only">Submit</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
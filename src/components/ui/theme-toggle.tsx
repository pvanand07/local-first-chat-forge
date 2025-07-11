import React from 'react';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className, 
  variant = 'dropdown',
  size = 'default'
}) => {
  const { theme, resolvedTheme, toggleTheme, setTheme } = useTheme();

  // Simple button variant that cycles through themes
  if (variant === 'button') {
    const getIcon = () => {
      switch (theme) {
        case 'light':
          return <Sun className="h-4 w-4" />;
        case 'dark':
          return <Moon className="h-4 w-4" />;
        case 'system':
          return <Monitor className="h-4 w-4" />;
        default:
          return <Palette className="h-4 w-4" />;
      }
    };

    return (
      <Button
        variant="outline"
        size={size}
        onClick={toggleTheme}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "hover:scale-105 active:scale-95",
          "bg-gradient-to-r from-background to-secondary/50",
          "border-border/60 hover:border-primary/50",
          "shadow-sm hover:shadow-md",
          className
        )}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            {getIcon()}
            <div className="absolute inset-0 rounded-full bg-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          {size !== 'icon' && (
            <span className="text-sm font-medium capitalize">
              {theme}
            </span>
          )}
        </div>
      </Button>
    );
  }

  // Dropdown variant with all theme options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn(
            "relative overflow-hidden transition-all duration-300",
            "hover:scale-105 active:scale-95",
            "bg-gradient-to-r from-background to-secondary/50",
            "border-border/60 hover:border-primary/50",
            "shadow-sm hover:shadow-md",
            className
          )}
          aria-label="Toggle theme"
        >
          <div className="relative">
            {resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <div className="absolute inset-0 rounded-full bg-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          {size !== 'icon' && (
            <span className="ml-2 text-sm font-medium hidden md:inline">
              Theme
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className={cn(
          "min-w-40 p-1",
          "bg-gradient-to-b from-background to-secondary/20",
          "border-border/60 shadow-lg",
          "backdrop-blur-lg"
        )}
      >
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md",
            "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
            "transition-all duration-200",
            theme === 'light' && "bg-primary/10 text-primary font-medium"
          )}
        >
          <Sun className="h-4 w-4" />
          <span>Light</span>
          {theme === 'light' && (
            <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md",
            "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
            "transition-all duration-200",
            theme === 'dark' && "bg-primary/10 text-primary font-medium"
          )}
        >
          <Moon className="h-4 w-4" />
          <span>Dark</span>
          {theme === 'dark' && (
            <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md",
            "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
            "transition-all duration-200",
            theme === 'system' && "bg-primary/10 text-primary font-medium"
          )}
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {theme === 'system' && (
            <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 
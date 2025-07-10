import { v4 as uuidv4 } from 'uuid';
import { Message } from './database';
import { localDeviceId } from './database';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class AIService {
  async generateResponse(
    messages: ChatMessage[],
    conversationId: string,
    onChunk: (chunk: string) => void,
    apiKey?: string
  ): Promise<Message> {

    // Use OpenRouter API key from environment or provided key
    const openRouterKey = apiKey || import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!openRouterKey) {
      const errorMessage = "OpenRouter API key not configured. Please set your API key in the settings.";
      return this.createMessage(conversationId, errorMessage);
    }

    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'Local-First Chat'
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant. Provide concise, accurate, and helpful responses."
            },
            ...messages
          ],
          stream: true,
          max_tokens: 1000,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorText}`);
      }

      // Stream processing
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content || '';
              
              if (token) {
                content += token;
                onChunk(token);
              }
            } catch (e) {
              // Skip invalid JSON chunks
              continue;
            }
          }
        }
      }

      return this.createMessage(conversationId, content || "I apologize, but I couldn't generate a response. Please try again.");

    } catch (error) {
      console.error('AI request failed:', error);
      
      let errorMessage = "I'm having trouble connecting to the AI service. ";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage += "The request timed out. Please try again.";
        } else if (error.message.includes('401')) {
          errorMessage += "Invalid API key. Please check your OpenRouter API key.";
        } else if (error.message.includes('429')) {
          errorMessage += "Rate limit exceeded. Please wait a moment and try again.";
        } else {
          errorMessage += "Please try again later.";
        }
      } else {
        errorMessage += "Please try again later.";
      }
      
      return this.createMessage(conversationId, errorMessage);
    }
  }

  private createMessage(conversationId: string, content: string): Message {
    return {
      id: uuidv4(),
      conversation_id: conversationId,
      role: 'assistant',
      content,
      timestamp: Date.now(),
      syncStatus: 'pending',
      vector: { [localDeviceId]: Date.now() }
    };
  }
}

export const aiService = new AIService();
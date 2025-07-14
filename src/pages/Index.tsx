import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // No longer redirect to auth - allow guest usage
  // Users can access /auth manually or through the sidebar

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <ChatInterface />;
};

export default Index;

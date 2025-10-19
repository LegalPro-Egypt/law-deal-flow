import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowRight } from 'lucide-react';

export const LexaInput = () => {
  const [question, setQuestion] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      navigate('/qa-chat', { state: { initialMessage: question.trim() } });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="ai-ring shadow-sm">
      <form 
        onSubmit={handleSubmit}
        className="flex items-center gap-3 px-5 bg-transparent rounded-full hover:shadow-md transition-all duration-200 h-14 group cursor-text"
        role="button"
        tabIndex={0}
        aria-label="Ask Lexa a legal question"
      >
        <HelpCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask Lexa…"
          className="flex-1 bg-transparent border-none outline-none text-base text-foreground placeholder:text-muted-foreground"
        />
        
        {question.trim() && (
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        )}
      </form>
    </div>
  );
};

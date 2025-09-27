import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  onClose: () => void;
}

export const DiffViewer = ({ oldContent, newContent, onClose }: DiffViewerProps) => {
  // Simple diff implementation - you could replace this with a more sophisticated diff library
  const generateDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    const diff = [];
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine === newLine) {
        diff.push({ type: 'unchanged', content: oldLine, lineNumber: i + 1 });
      } else if (oldLine && !newLine) {
        diff.push({ type: 'removed', content: oldLine, lineNumber: i + 1 });
      } else if (!oldLine && newLine) {
        diff.push({ type: 'added', content: newLine, lineNumber: i + 1 });
      } else {
        diff.push({ type: 'removed', content: oldLine, lineNumber: i + 1 });
        diff.push({ type: 'added', content: newLine, lineNumber: i + 1 });
      }
    }
    
    return diff;
  };

  const diff = generateDiff(oldContent, newContent);

  const getLineClassName = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-l-4 border-green-400 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'removed':
        return 'bg-red-50 border-l-4 border-red-400 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      default:
        return 'bg-background';
    }
  };

  const getLinePrefix = (type: string) => {
    switch (type) {
      case 'added':
        return '+ ';
      case 'removed':
        return '- ';
      default:
        return '  ';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
      
      <ScrollArea className="max-h-[50vh] border rounded-lg">
        <div className="font-mono text-sm">
          {diff.map((line, index) => (
            <div
              key={index}
              className={`px-4 py-1 ${getLineClassName(line.type)}`}
            >
              <span className="inline-block w-12 text-muted-foreground mr-2">
                {line.lineNumber}
              </span>
              <span className="font-bold mr-2">{getLinePrefix(line.type)}</span>
              <span>{line.content}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2 text-red-600">Removed Content</h4>
          <ScrollArea className="max-h-[30vh] border rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: oldContent }} />
            </div>
          </ScrollArea>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-green-600">Added Content</h4>
          <ScrollArea className="max-h-[30vh] border rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: newContent }} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
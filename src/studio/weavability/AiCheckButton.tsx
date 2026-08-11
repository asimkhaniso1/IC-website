import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/index';

/**
 * Small secondary trigger for the AI-assisted manufacturability review.
 * Purely presentational — the caller (DesignerPage) owns the fetch call,
 * modal and result state so this component stays trivial to reuse.
 */
export function AiCheckButton({
  onClick,
  loading,
  className = '',
}: {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Button size="sm" variant="secondary" onClick={onClick} disabled={loading} className={className}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      AI review
    </Button>
  );
}

export default AiCheckButton;

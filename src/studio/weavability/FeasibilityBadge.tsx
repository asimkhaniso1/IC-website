import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../components/ui/index';
import type { Feasibility } from '../../lib/types';

const CONFIG: Record<
  Feasibility,
  { tone: 'green' | 'amber' | 'red'; label: string; Icon: typeof CheckCircle2 }
> = {
  suitable: { tone: 'green', label: 'Suitable for Manufacturing', Icon: CheckCircle2 },
  review: { tone: 'amber', label: 'Review Recommended', Icon: AlertTriangle },
  modification: { tone: 'red', label: 'Likely Modification Required', Icon: AlertOctagon },
};

export function FeasibilityBadge({
  level,
  className = '',
}: {
  level: Feasibility;
  className?: string;
}) {
  const { tone, label, Icon } = CONFIG[level];
  return (
    <Badge tone={tone} className={className}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Badge>
  );
}

export default FeasibilityBadge;

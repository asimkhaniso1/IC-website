import type { DesignerControlsProps, JacquardSpec } from '../../../lib/types';
import { AdvancedTechnicalPanel } from '../../shared';
import { ArtworkPanel } from './ArtworkPanel';
import { ColorsPanel } from './ColorsPanel';
import { ColorwaysPanel } from './ColorwaysPanel';
import { FabricPanel } from './FabricPanel';

export function Controls({ spec, onChange }: DesignerControlsProps<JacquardSpec>) {
  return (
    <div className="flex flex-col gap-4">
      {/* Repeat controls live inside ArtworkPanel, above the artwork X/Y offset fields. */}
      <ArtworkPanel spec={spec} onChange={onChange} />
      <FabricPanel spec={spec} onChange={onChange} />
      <ColorsPanel spec={spec} onChange={onChange} />
      <ColorwaysPanel spec={spec} onChange={onChange} />
      <AdvancedTechnicalPanel spec={spec} onChange={onChange} />
    </div>
  );
}

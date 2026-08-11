import type { DesignerControlsProps, JacquardSpec } from '../../../lib/types';
import { ArtworkPanel } from './ArtworkPanel';
import { ColorsPanel } from './ColorsPanel';
import { ColorwaysPanel } from './ColorwaysPanel';
import { FabricPanel } from './FabricPanel';
import { RepeatPanel } from './RepeatPanel';

export function Controls({ spec, onChange }: DesignerControlsProps<JacquardSpec>) {
  return (
    <div className="flex flex-col gap-4">
      <FabricPanel spec={spec} onChange={onChange} />
      <ArtworkPanel spec={spec} onChange={onChange} />
      <ColorsPanel spec={spec} onChange={onChange} />
      <RepeatPanel spec={spec} onChange={onChange} />
      <ColorwaysPanel spec={spec} onChange={onChange} />
    </div>
  );
}

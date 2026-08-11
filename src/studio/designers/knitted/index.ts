import type { DesignerModule, KnittedSpec } from '../../../lib/types';
import { KnittedControls } from './KnittedControls';

function createDefaultSpec(): KnittedSpec {
  return {
    family: 'K',
    name: 'Untitled knitted design',
    widthMm: 20,
    unit: 'mm',
    rollLengthM: 100,
    elastic: true,
    elasticityClass: 'medium',
    firmness: 'soft',
    thicknessClass: 'standard',
    baseColor: '#f8fafc',
    edgeStyle: 'straight',
    application: 'Underwear',
    style: 'standard',
    rubber: true,
  };
}

export const knittedDesigner: DesignerModule<KnittedSpec> = {
  family: 'K',
  label: 'Knitted Elastic',
  description:
    'Soft, lightweight knitted elastics for underwear, medical and general garment applications.',
  createDefaultSpec,
  Controls: KnittedControls,
};

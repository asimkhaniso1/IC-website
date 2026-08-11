import type { DesignerModule, WovenSpec } from '../../../lib/types';
import { WovenControls } from './WovenControls';

function createDefaultSpec(): WovenSpec {
  return {
    family: 'W',
    name: 'Untitled woven design',
    widthMm: 25,
    unit: 'mm',
    rollLengthM: 50,
    elastic: true,
    elasticityClass: 'medium',
    thicknessClass: 'standard',
    baseColor: '#0f172a',
    edgeStyle: 'straight',
    application: 'Waistband',
    stripes: [{ id: 'stripe-default', color: '#ffffff', widthMm: 3, offsetMm: 0 }],
    rubber: 'single',
  };
}

export const wovenDesigner: DesignerModule<WovenSpec> = {
  family: 'W',
  label: 'Woven Elastic / Tape',
  description:
    'Durable woven elastics and non-elastic tapes with custom stripes, edges and constructions.',
  createDefaultSpec,
  Controls: WovenControls,
};

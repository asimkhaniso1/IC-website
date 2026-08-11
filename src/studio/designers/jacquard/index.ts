import type { DesignerModule, JacquardSpec } from '../../../lib/types';
import { Controls } from './Controls';

function createDefaultSpec(): JacquardSpec {
  return {
    family: 'J',
    name: 'Untitled Jacquard Design',
    widthMm: 40,
    unit: 'mm',
    rollLengthM: 50,
    elastic: true,
    elasticityClass: 'medium',
    thicknessClass: 'standard',
    baseColor: '#1e293b',
    edgeColor: '#1e293b',
    edgeStyle: 'straight',
    application: 'Waistband',
    fg: '#ffffff',
    artwork: [],
    repeat: {
      lengthMm: 60,
      spacingMm: 10,
      mirror: false,
      reverse: false,
    },
    colorways: [],
  };
}

export const jacquardDesigner: DesignerModule<JacquardSpec> = {
  family: 'J',
  label: 'Jacquard Elastic',
  description: 'Weave your logo, brand name or pattern directly into the elastic.',
  createDefaultSpec,
  Controls,
};

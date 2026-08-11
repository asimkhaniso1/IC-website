import type { DesignStatus } from '../../../lib/types';

export type BadgeTone = 'brand' | 'green' | 'amber' | 'red' | 'slate';

/** Visual tone per design status, used for the status Badge everywhere in admin. */
export const STATUS_TONE: Record<DesignStatus, BadgeTone> = {
  Draft: 'slate',
  Submitted: 'brand',
  'Under Technical Review': 'amber',
  'Modification Required': 'red',
  'Sample Development': 'amber',
  'Sample Approved': 'green',
  Quoted: 'brand',
  'Order Confirmed': 'green',
  Rejected: 'red',
  Archived: 'slate',
};

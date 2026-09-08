import { getSupabase } from '../lib/supabase';

export type FactoryOrder = {
  production_order_id: string;
  production_order_no: string;
  status: string;
  target_quantity: number | null;
  product: { description: string; product_code: string } | null;
  batch: Array<{
    production_batch_id: string;
    batch_code: string;
    status: string;
    actual_quantity: number;
    machine: { machine_name: string; legacy_machine_no: number | null } | null;
  }>;
};

export type FactoryOption = { id: string; label: string; meta?: string };

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function listProductionOrders(): Promise<FactoryOrder[]> {
  const { data, error } = await client()
    .from('production_orders')
    .select('production_order_id,production_order_no,status,target_quantity,product:products(description,product_code),batch:production_batches(production_batch_id,batch_code,status,actual_quantity,machine:machines(machine_name,legacy_machine_no))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FactoryOrder[];
}

export async function listFactoryOptions() {
  const supabase = client();
  const [machines, operators, shifts, teams] = await Promise.all([
    supabase.from('machines').select('machine_id,machine_name,legacy_machine_no').eq('active_status', true).order('legacy_machine_no'),
    supabase.from('operators').select('operator_id,full_name,operator_code').eq('active_status', true).order('full_name'),
    supabase.from('shifts').select('shift_id,shift_name').eq('active', true).order('shift_name'),
    supabase.from('teams').select('team_id,team_code,team_name').eq('active', true).order('team_code'),
  ]);
  for (const result of [machines, operators, shifts, teams]) if (result.error) throw result.error;
  return {
    machines: (machines.data ?? []).map((x) => ({ id: x.machine_id, label: x.machine_name, meta: x.legacy_machine_no ? `MACH ${x.legacy_machine_no}` : undefined })),
    operators: (operators.data ?? []).map((x) => ({ id: x.operator_id, label: x.full_name, meta: x.operator_code })),
    shifts: (shifts.data ?? []).map((x) => ({ id: x.shift_id, label: x.shift_name })),
    teams: (teams.data ?? []).map((x) => ({ id: x.team_id, label: x.team_name || `Team ${x.team_code}`, meta: x.team_code })),
  } satisfies Record<string, FactoryOption[]>;
}

export async function assignMachine(productionOrderId: string, machineId: string) {
  const { data, error } = await client().rpc('assign_factory_machine', { p_production_order: productionOrderId, p_machine: machineId });
  if (error) throw error;
  return data as string;
}

export async function recordProduction(input: {
  batchId: string; operatorId: string; shiftId: string; teamId: string;
  strips: number; meterPerStrip: number; kgPerStrip: number; wastage?: number; remarks?: string;
}) {
  const { data, error } = await client().rpc('record_factory_production', {
    p_batch: input.batchId, p_operator: input.operatorId, p_shift: input.shiftId, p_team: input.teamId,
    p_strip: input.strips, p_meter_per_strip: input.meterPerStrip, p_kg_per_strip: input.kgPerStrip,
    p_wastage: input.wastage ?? null, p_remarks: input.remarks || null,
  });
  if (error) throw error;
  return data as string;
}

export async function completeBatch(batchId: string) {
  const { data, error } = await client().rpc('complete_factory_batch', { p_batch: batchId });
  if (error) throw error;
  return data as string;
}

export async function listStock() {
  const { data, error } = await client().from('stock_ledger')
    .select('stock_ledger_id,transaction_date,quantity,stock_category,ownership,reference_note,product:products(product_code,description),uom:uoms(uom_code),location:locations(location_name)')
    .order('transaction_date', { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

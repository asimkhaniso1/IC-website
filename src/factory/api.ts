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
    .select('stock_ledger_id,transaction_date,quantity,stock_category,ownership,reference_note,product:products(product_code,description),material:materials(material_code,material_name),uom:uoms(uom_code),location:locations(location_name)')
    .order('transaction_date', { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listSetupData() {
  const supabase = client();
  const [groups, customers, products, operators, machines] = await Promise.all([
    supabase.from('machine_groups').select('machine_group_id,group_name').eq('active_status', true).order('display_order'),
    supabase.from('customers').select('customer_id,customer_code,customer_name').eq('active_status', true).order('customer_name'),
    supabase.from('products').select('product_id,product_code,description').eq('active_status', true).order('description'),
    supabase.from('operators').select('operator_id,operator_code,full_name').eq('active_status', true).order('full_name'),
    supabase.from('machines').select('machine_id,legacy_machine_no,machine_name,machine_group(group_name)').eq('active_status', true).order('legacy_machine_no'),
  ]);
  for (const result of [groups, customers, products, operators, machines]) if (result.error) throw result.error;
  return { groups: groups.data ?? [], customers: customers.data ?? [], products: products.data ?? [], operators: operators.data ?? [], machines: machines.data ?? [] };
}

export async function createMaster(kind: 'customer'|'product'|'operator'|'machine', values: Record<string, unknown>) {
  const table = ({ customer: 'customers', product: 'products', operator: 'operators', machine: 'machines' } as const)[kind];
  const { error } = await client().from(table).insert(values);
  if (error) throw error;
}

export async function createFactoryOrder(input: { customerId:string; productId:string; quantity:number; notes?:string }) {
  const { data, error } = await client().rpc('create_factory_order', {
    p_customer: input.customerId, p_product: input.productId, p_quantity: input.quantity,
    p_notes: input.notes || null,
  });
  if (error) throw error;
  return data as string;
}

export async function listReceivingData() {
  const supabase=client();
  const [suppliers,materials,grns,uoms]=await Promise.all([
    supabase.from('suppliers').select('supplier_id,supplier_code,supplier_name').eq('active_status',true).order('supplier_name'),
    supabase.from('materials').select('material_id,material_code,material_name').eq('active_status',true).order('material_name'),
    supabase.from('grns').select('grn_id,grn_no,grn_date,status,ownership,supplier:suppliers(supplier_name),lines:grn_lines(qty,total_weight)').order('created_at',{ascending:false}).limit(25),
    supabase.from('uoms').select('uom_id,uom_code').eq('active_status',true),
  ]); for(const r of [suppliers,materials,grns,uoms])if(r.error)throw r.error;
  return {suppliers:suppliers.data??[],materials:materials.data??[],grns:grns.data??[],uoms:uoms.data??[]};
}

export async function createReceivingMaster(kind:'supplier'|'material',values:Record<string,unknown>){
  const {error}=await client().from(kind==='supplier'?'suppliers':'materials').insert(values);if(error)throw error;
}

export async function postGrn(input:{supplierId:string;ownership:string;driver?:string;vehicle?:string;receivedBy?:string;lines:Array<Record<string,unknown>>}){
  const {data,error}=await client().rpc('post_factory_grn',{p_supplier:input.supplierId,p_ownership:input.ownership,p_driver:input.driver||null,p_vehicle:input.vehicle||null,p_lines:input.lines,p_received_by:input.receivedBy||null});if(error)throw error;return data as string;
}

export async function listPurchaseRequests(){const{data,error}=await client().from('purchase_requests').select('purchase_request_id,purchase_request_no,request_date,requested_by,department,purpose,status,lines:purchase_request_lines(item_description,quantity,rate,uom_text),approvals:purchase_request_approvals(approval_level,approver_name,approved_at)').order('created_at',{ascending:false});if(error)throw error;return data??[]}
export async function createPurchaseRequest(input:{requestedBy:string;department:string;purpose:string;remarks:string;lines:Array<Record<string,unknown>>}){const{data,error}=await client().rpc('create_purchase_request',{p_requested_by:input.requestedBy,p_department:input.department,p_purpose:input.purpose,p_remarks:input.remarks||null,p_lines:input.lines});if(error)throw error;return data as string}
export async function advancePurchaseRequest(id:string,name:string,notes:string){const{data,error}=await client().rpc('advance_purchase_request',{p_request:id,p_approver_name:name,p_notes:notes||null});if(error)throw error;return data as string}

export async function listDailyProduction(date:string){const{data,error}=await client().from('production_entries').select('production_entry_id,report_date,legacy_machine_no,strip,machine_speed,ply,gauge,total_meter_per_strip,total_meter,column1_kg_per_strip,per_machine_kg,wastage,remarks,operator:operators(full_name),shift:shifts(shift_name),team:teams(team_code),batch:production_batches(batch_code,machine:machines(machine_name)),order:production_orders(production_order_no,product:products(product_code,description))').eq('report_date',date).order('created_at');if(error)throw error;return data??[]}
export async function listDailyStock(date:string){const end=new Date(`${date}T23:59:59.999Z`).toISOString();const{data,error}=await client().from('stock_ledger').select('stock_ledger_id,transaction_date,quantity,stock_category,ownership,source_transaction_type,reference_note,product:products(product_code,description),material:materials(material_code,material_name),uom:uoms(uom_code),location:locations(location_name)').lte('transaction_date',end).order('transaction_date');if(error)throw error;return data??[]}
export async function listGatePasses(){const{data,error}=await client().from('gate_passes').select('gate_pass_id,serial_no,pass_type,company_name,pass_date,person_name,vehicle_no,status,lines:gate_pass_lines(description,quantity,uom_text)').order('created_at',{ascending:false}).limit(30);if(error)throw error;return data??[]}
export async function issueGatePass(input:Record<string,unknown>){const{data,error}=await client().rpc('issue_gate_pass',input);if(error)throw error;return data as string}
export async function listStockRegister(){const{data,error}=await client().from('stock_ledger').select('stock_ledger_id,transaction_date,quantity,stock_category,ownership,source_transaction_type,reference_note,product:products(product_id,product_code,description),material:materials(material_id,material_code,material_name),uom:uoms(uom_code),location:locations(location_id,location_name)').order('transaction_date');if(error)throw error;return data??[]}
export async function listAuditEvents(){const{data,error}=await client().from('audit_log').select('audit_log_id,event_timestamp,user_id,user_role,action,entity_type,entity_id,old_value,new_value,reason,source').order('event_timestamp',{ascending:false}).limit(500);if(error)throw error;return data??[]}
export async function listQcData(){const s=client();const[batches,operators,inspections]=await Promise.all([s.from('production_batches').select('production_batch_id,batch_code,status,machine:machines(machine_name,legacy_machine_no),order:production_orders(production_order_no,product:products(product_code,description,width_mm))').in('status',['RUNNING','COMPLETE']).order('created_at',{ascending:false}),s.from('operators').select('operator_id,full_name').eq('active_status',true),s.from('qc_inspections').select('qc_inspection_id,inspection_date,inspection_type,overall_result,sample_size,notes,created_at,batch:production_batches(batch_code,machine:machines(machine_name)),inspector:operators(full_name),defects:qc_defects(defect_type,defect_severity)').order('created_at',{ascending:false}).limit(100)]);for(const r of[batches,operators,inspections])if(r.error)throw r.error;return{batches:batches.data??[],operators:operators.data??[],inspections:inspections.data??[]}}
export async function submitQcInspection(input:Record<string,unknown>){const{data,error}=await client().rpc('submit_qc_inspection',input);if(error)throw error;return data as string}

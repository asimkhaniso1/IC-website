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

export async function listCustomerOrders(){const{data,error}=await client().from('orders').select('order_id,order_no,order_date,status,notes,customer:customers(customer_name,customer_code),items:order_items(order_item_id,quantity,product:products(product_code,description),uom:uoms(uom_code),production:production_orders(production_order_no,status,priority,planned_start_date,planned_end_date,batches:production_batches(batch_code,status,actual_quantity)))').order('created_at',{ascending:false});if(error)throw error;return data??[]}

export async function listPurchaseOrderData(){const s=client();const[requests,suppliers,orders]=await Promise.all([s.from('purchase_requests').select('purchase_request_id,purchase_request_no,purpose,request_date,lines:purchase_request_lines(item_description,quantity,uom_text,rate)').eq('status','APPROVED').order('created_at',{ascending:false}),s.from('suppliers').select('supplier_id,supplier_code,supplier_name').eq('active_status',true).order('supplier_name'),s.from('purchase_orders').select('purchase_order_id,purchase_order_no,order_date,expected_date,status,terms,remarks,supplier:suppliers(supplier_name),request:purchase_requests(purchase_request_no),lines:purchase_order_lines(item_description,quantity,uom_text,rate)').order('created_at',{ascending:false})]);for(const r of[requests,suppliers,orders])if(r.error)throw r.error;return{requests:requests.data??[],suppliers:suppliers.data??[],orders:orders.data??[]}}
export async function createPurchaseOrder(input:{requestId:string;supplierId:string;expectedDate?:string;terms?:string;remarks?:string}){const{data,error}=await client().rpc('create_purchase_order',{p_request:input.requestId,p_supplier:input.supplierId,p_expected:input.expectedDate||null,p_terms:input.terms||null,p_remarks:input.remarks||null});if(error)throw error;return data as string}

export async function listOperationsDashboard(){const s=client(),today=new Date().toISOString().slice(0,10);const[machines,batches,entries,inspections,orders,requests,stock,audit]=await Promise.all([s.from('machines').select('machine_id,active_status'),s.from('production_batches').select('production_batch_id,batch_code,status,actual_quantity,machine:machines(machine_name),order:production_orders(production_order_no,target_quantity,product:products(description))').in('status',['ASSIGNED','SETUP','RUNNING']),s.from('production_entries').select('production_entry_id,total_meter,per_machine_kg,wastage').eq('report_date',today),s.from('qc_inspections').select('qc_inspection_id,overall_result,created_at,batch:production_batches(batch_code)').gte('created_at',`${today}T00:00:00`),s.from('production_orders').select('production_order_id,status').neq('status','CANCELLED'),s.from('purchase_requests').select('purchase_request_id,status').neq('status','APPROVED').neq('status','REJECTED'),s.from('stock_ledger').select('stock_ledger_id,quantity,stock_category,source_transaction_type,transaction_date').gte('transaction_date',`${today}T00:00:00`),s.from('audit_log').select('audit_log_id,event_timestamp,action,entity_type,new_value').order('event_timestamp',{ascending:false}).limit(8)]);for(const r of[machines,batches,entries,inspections,orders,requests,stock,audit])if(r.error)throw r.error;return{machines:machines.data??[],batches:batches.data??[],entries:entries.data??[],inspections:inspections.data??[],orders:orders.data??[],requests:requests.data??[],stock:stock.data??[],audit:audit.data??[]}}

export async function listReceivingData() {
  const supabase=client();
  const [suppliers,materials,grns,uoms,purchaseOrders]=await Promise.all([
    supabase.from('suppliers').select('supplier_id,supplier_code,supplier_name').eq('active_status',true).order('supplier_name'),
    supabase.from('materials').select('material_id,material_code,material_name').eq('active_status',true).order('material_name'),
    supabase.from('grns').select('grn_id,grn_no,grn_date,status,ownership,supplier:suppliers(supplier_name),purchase_order:purchase_orders(purchase_order_no),lines:grn_lines(qty,total_weight)').order('created_at',{ascending:false}).limit(25),
    supabase.from('uoms').select('uom_id,uom_code').eq('active_status',true),
    supabase.from('purchase_orders').select('purchase_order_id,purchase_order_no,supplier_id,status,lines:purchase_order_lines(item_description,quantity,uom_text)').in('status',['ISSUED','PART_RECEIVED']).order('created_at'),
  ]); for(const r of [suppliers,materials,grns,uoms,purchaseOrders])if(r.error)throw r.error;
  return {suppliers:suppliers.data??[],materials:materials.data??[],grns:grns.data??[],uoms:uoms.data??[],purchaseOrders:purchaseOrders.data??[]};
}

export async function createReceivingMaster(kind:'supplier'|'material',values:Record<string,unknown>){
  const {error}=await client().from(kind==='supplier'?'suppliers':'materials').insert(values);if(error)throw error;
}

export async function postGrn(input:{supplierId:string;ownership:string;driver?:string;vehicle?:string;receivedBy?:string;lines:Array<Record<string,unknown>>}){
  const {data,error}=await client().rpc('post_factory_grn',{p_supplier:input.supplierId,p_ownership:input.ownership,p_driver:input.driver||null,p_vehicle:input.vehicle||null,p_lines:input.lines,p_received_by:input.receivedBy||null});if(error)throw error;return data as string;
}
export async function postPurchaseOrderGrn(input:{purchaseOrderId:string;ownership:string;driver?:string;vehicle?:string;receivedBy?:string;lines:Array<Record<string,unknown>>}){const{data,error}=await client().rpc('post_factory_po_grn',{p_purchase_order:input.purchaseOrderId,p_ownership:input.ownership,p_driver:input.driver||null,p_vehicle:input.vehicle||null,p_lines:input.lines,p_received_by:input.receivedBy||null});if(error)throw error;return data as string}

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
export async function listPackingData(){const s=client();const[batches,records,finished]=await Promise.all([s.from('production_batches').select('production_batch_id,batch_code,actual_quantity,order:production_orders!inner(status,production_order_no,product:products(product_code,description))').eq('order.status','QC_APPROVED'),s.from('packing_records').select('packing_record_id,packing_record_no,packed_date,quantity,roll_count,carton_count,packed_by,batch:production_batches(batch_code)').order('created_at',{ascending:false}),s.from('finished_goods').select('finished_goods_id,quantity,status,product:products(product_code,description),location:locations(location_name),uom:uoms(uom_code)').order('created_at',{ascending:false})]);for(const r of[batches,records,finished])if(r.error)throw r.error;return{batches:batches.data??[],records:records.data??[],finished:finished.data??[]}}
export async function packFinishedGoods(input:Record<string,unknown>){const{data,error}=await client().rpc('pack_finished_goods',input);if(error)throw error;return data as string}
export async function listDispatchData(){const s=client();const[goods,passes,dispatches,schedules]=await Promise.all([s.from('finished_goods').select('finished_goods_id,quantity,status,product:products(product_code,description),uom:uoms(uom_code),batch:production_batches(batch_code)').eq('status','AVAILABLE'),s.from('gate_passes').select('gate_pass_id,serial_no,company_name,vehicle_no').eq('status','ISSUED').is('dispatch_id',null),s.from('dispatches').select('dispatch_id,dispatch_no,dispatch_date,quantity,vehicle_no,driver_name,status,customer:customers(customer_name),goods:finished_goods(product:products(product_code,description)),schedule:dispatch_schedules(schedule_no),uom:uoms(uom_code)').order('created_at',{ascending:false}),s.from('dispatch_schedules').select('dispatch_schedule_id,schedule_no,scheduled_date,delivery_location,vehicle_no,driver_name,customer:customers(customer_name),goods:finished_goods(finished_goods_id,quantity,product:products(product_code,description),uom:uoms(uom_code))').in('status',['PLANNED','READY']).order('scheduled_date')]);for(const r of[goods,passes,dispatches,schedules])if(r.error)throw r.error;return{goods:goods.data??[],passes:passes.data??[],dispatches:dispatches.data??[],schedules:(schedules.data??[])as unknown as any[]}}
export async function dispatchFinishedGoods(input:Record<string,unknown>){const{data,error}=await client().rpc('dispatch_finished_goods',input);if(error)throw error;return data as string}
export async function dispatchScheduledGoods(input:Record<string,unknown>){const{data,error}=await client().rpc('dispatch_scheduled_goods',input);if(error)throw error;return data as string}
export async function listFactoryUsers(){const s=client();const[users,roles]=await Promise.all([s.rpc('list_factory_users'),s.from('factory_roles').select('role_code,role_name').order('role_name')]);for(const r of[users,roles])if(r.error)throw r.error;return{users:(users.data??[])as unknown as any[],roles:roles.data??[]}}
export async function assignFactoryRole(user:string,role:string){const{error}=await client().rpc('assign_factory_user_role',{p_user:user,p_role:role});if(error)throw error}
export async function removeFactoryRole(user:string,role:string){const{error}=await client().rpc('remove_factory_user_role',{p_user:user,p_role:role});if(error)throw error}
export async function listProcurementMaster(){const s=client();const[suppliers,materials,uoms]=await Promise.all([s.from('suppliers').select('*').order('supplier_code'),s.from('materials').select('*,uom:uoms(uom_code)').order('material_code'),s.from('uoms').select('uom_id,uom_code,uom_name').order('uom_code')]);for(const r of[suppliers,materials,uoms])if(r.error)throw r.error;return{suppliers:suppliers.data??[],materials:materials.data??[],uoms:uoms.data??[]}}
export async function createSupplier(values:Record<string,unknown>){const{data,error}=await client().rpc('create_factory_supplier',{p_code:values.code,p_name:values.name,p_type:values.type||null,p_contact:values.contact||null,p_phone:values.phone||null,p_notes:values.notes||null});if(error)throw error;return data}
export async function createMaterial(values:Record<string,unknown>){const{data,error}=await client().rpc('create_factory_material',{p_code:values.code,p_name:values.name,p_category:values.category,p_uom:values.uom,p_lot_control:values.lotControl,p_notes:values.notes||null});if(error)throw error;return data}
export async function listPendingApprovals(){const{data,error}=await client().from('purchase_requests').select('purchase_request_id,purchase_request_no,request_date,requested_by,department,purpose,remarks,status,lines:purchase_request_lines(item_description,quantity,uom_text,rate,remarks),approvals:purchase_request_approvals(approval_level,approver_name,approved_at,notes)').in('status',['PENDING_CHECK','PENDING_PREAPPROVAL','PENDING_APPROVAL']).order('created_at',{ascending:true});if(error)throw error;return data??[]}
export async function rejectPurchaseRequest(request:string,reason:string){const{data,error}=await client().rpc('reject_purchase_request',{p_request:request,p_reason:reason});if(error)throw error;return data}
export async function listQuotationData(){const s=client();const[sources,customers,products,quotes]=await Promise.all([s.rpc('list_factory_quote_sources'),s.from('customers').select('customer_id,customer_code,customer_name').eq('active_status',true).order('customer_name'),s.from('products').select('product_id,product_code,description').eq('active_status',true).order('description'),s.from('factory_quotations').select('*,customer:customers(customer_code,customer_name),product:products(product_code,description)').order('created_at',{ascending:false})]);for(const r of[sources,customers,products,quotes])if(r.error)throw r.error;return{sources:(sources.data??[])as any[],customers:customers.data??[],products:products.data??[],quotes:quotes.data??[]}}
export async function createFactoryQuotation(v:Record<string,unknown>){const{data,error}=await client().rpc('create_factory_quotation',{p_rfq:v.rfq,p_customer:v.customer,p_product:v.product,p_quantity:v.quantity,p_unit_rate:v.rate,p_currency:v.currency,p_valid_until:v.validUntil,p_terms:v.terms||null});if(error)throw error;return data}
export async function acceptFactoryQuotation(id:string){const{data,error}=await client().rpc('accept_factory_quotation',{p_quotation:id});if(error)throw error;return data}
export async function declineFactoryQuotation(id:string,reason:string){const{data,error}=await client().rpc('decline_factory_quotation',{p_quotation:id,p_reason:reason});if(error)throw error;return data}
export async function listSampleDevelopmentData(){const s=client();const[sources,samples]=await Promise.all([s.rpc('list_factory_sample_sources'),s.from('factory_samples').select('*').order('created_at',{ascending:false})]);for(const r of[sources,samples])if(r.error)throw r.error;return{sources:(sources.data??[])as any[],samples:samples.data??[]}}
export async function createFactorySample(rfq:string,assignedTo:string,targetDate:string,notes:string){const{data,error}=await client().rpc('create_factory_sample',{p_rfq:rfq,p_assigned_to:assignedTo,p_target_date:targetDate||null,p_notes:notes||null});if(error)throw error;return data}
export async function advanceFactorySample(id:string,status:string,actor:string,notes:string){const{data,error}=await client().rpc('advance_factory_sample',{p_sample:id,p_status:status,p_actor:actor,p_notes:notes||null});if(error)throw error;return data}
export async function listQuickBooksExportData(){const s=client();const[customers,suppliers,products,quotes,dispatches,purchases,history]=await Promise.all([s.from('customers').select('customer_id,customer_code,customer_name,contact_person').eq('active_status',true),s.from('suppliers').select('supplier_id,supplier_code,supplier_name,contact_person,contact_phone').eq('active_status',true),s.from('products').select('product_id,product_code,description,product_family').eq('active_status',true),s.from('factory_quotations').select('quotation_id,quotation_no,quantity,unit_rate,currency,valid_until,status,customer:customers(customer_name),product:products(product_code,description)').in('status',['SENT','ACCEPTED']),s.from('dispatches').select('dispatch_id,dispatch_no,dispatch_date,quantity,status,customer:customers(customer_name),goods:finished_goods(product:products(product_code,description)),uom:uoms(uom_code)').eq('status','DISPATCHED'),s.from('purchase_orders').select('purchase_order_id,purchase_order_no,order_date,expected_date,status,supplier:suppliers(supplier_name),lines:purchase_order_lines(item_description,quantity,uom_text,rate)').neq('status','CANCELLED'),s.from('quickbooks_export_batches').select('*').order('created_at',{ascending:false}).limit(20)]);for(const r of[customers,suppliers,products,quotes,dispatches,purchases,history])if(r.error)throw r.error;return{customers:customers.data??[],suppliers:suppliers.data??[],products:products.data??[],quotes:quotes.data??[],dispatches:(dispatches.data??[])as unknown as any[],purchases:purchases.data??[],history:history.data??[]}}
export async function recordQuickBooksExport(kind:string,ids:string[],filename:string){const{data,error}=await client().rpc('record_quickbooks_export',{p_kind:kind,p_record_ids:ids,p_filename:filename});if(error)throw error;return data}
export async function listTraceability():Promise<any[]>{const{data,error}=await client().from('production_batches').select('production_batch_id,batch_code,status,actual_quantity,machine:machines(machine_name),order:production_orders(production_order_no,status,order_item:order_items(order:orders(order_no,customer:customers(customer_name)),product:products(product_code,description)),entries:production_entries(production_entry_id,report_date,total_meter,operator:operators(full_name)),inspections:qc_inspections(qc_inspection_id,inspection_date,overall_result,defects:qc_defects(defect_type,defect_severity)),packing:packing_records(packing_record_no,quantity,roll_count,carton_count),finished:finished_goods(quantity,status),stock:stock_ledger(stock_ledger_id,transaction_date,quantity,stock_category,source_transaction_type)').order('created_at',{ascending:false});if(error)throw error;return(data??[])as unknown as any[]}
export async function listMachineOverview(){const{data,error}=await client().from('machines').select('machine_id,legacy_machine_no,machine_name,active_status,group:machine_groups(group_name),batches:production_batches(batch_code,status,actual_quantity,order:production_orders(production_order_no,product:products(description)),entries:production_entries(total_meter))').order('legacy_machine_no');if(error)throw error;return data??[]}
export async function listStockAdjustmentData(){const s=client();const[products,materials,uoms,locations,adjustments]=await Promise.all([s.from('products').select('product_id,product_code,description').eq('active_status',true).order('product_code'),s.from('materials').select('material_id,material_code,material_name').eq('active_status',true).order('material_code'),s.from('uoms').select('uom_id,uom_code').eq('active_status',true).order('uom_code'),s.from('locations').select('location_id,location_name').eq('active_status',true).order('location_name'),s.from('stock_ledger').select('stock_ledger_id,transaction_date,quantity,ownership,stock_category,reference_note,product:products(product_code,description),material:materials(material_code,material_name),uom:uoms(uom_code),location:locations(location_name)').eq('source_transaction_type','ADJUSTMENT').order('transaction_date',{ascending:false}).limit(30)]);for(const r of[products,materials,uoms,locations,adjustments])if(r.error)throw r.error;return{products:products.data??[],materials:materials.data??[],uoms:uoms.data??[],locations:locations.data??[],adjustments:adjustments.data??[]}}
export async function adjustStock(input:Record<string,unknown>){const{data,error}=await client().rpc('adjust_factory_stock',input);if(error)throw error;return data as string}
export async function listStockTransferData(){const s=client();const[base,transfers]=await Promise.all([listStockAdjustmentData(),s.from('stock_ledger').select('stock_ledger_id,source_transaction_id,transaction_date,quantity,ownership,stock_category,reference_note,product:products(product_code,description),material:materials(material_code,material_name),uom:uoms(uom_code),location:locations(location_name)').eq('source_transaction_type','TRANSFER').order('transaction_date',{ascending:false}).limit(60)]);if(transfers.error)throw transfers.error;return{...base,transfers:transfers.data??[]}}
export async function transferStock(input:Record<string,unknown>){const{data,error}=await client().rpc('transfer_factory_stock',input);if(error)throw error;return data as string}
export async function listMaintenanceData(){const s=client();const[machines,events]=await Promise.all([s.from('machines').select('machine_id,machine_name,legacy_machine_no,active_status,group:machine_groups(group_name)').order('legacy_machine_no'),s.from('maintenance_events').select('maintenance_event_id,event_no,reported_at,reported_by,category,severity,description,status,assigned_to,resolved_at,resolved_by,resolution,downtime_minutes,machine:machines(machine_name,legacy_machine_no)').order('reported_at',{ascending:false}).limit(100)]);for(const r of[machines,events])if(r.error)throw r.error;return{machines:machines.data??[],events:events.data??[]}}
export async function reportDowntime(input:Record<string,unknown>){const{data,error}=await client().rpc('report_machine_downtime',input);if(error)throw error;return data as string}
export async function resolveMaintenance(input:Record<string,unknown>){const{data,error}=await client().rpc('resolve_machine_maintenance',input);if(error)throw error;return data as string}
export async function listBomRoutingData(){const s=client();const[products,materials,uoms,groups,bom,routes]=await Promise.all([s.from('products').select('product_id,product_code,description').eq('active_status',true).order('product_code'),s.from('materials').select('material_id,material_code,material_name').eq('active_status',true).order('material_code'),s.from('uoms').select('uom_id,uom_code').eq('active_status',true).order('uom_code'),s.from('machine_groups').select('machine_group_id,group_name').eq('active_status',true).order('display_order'),s.from('product_bom_items').select('bom_item_id,quantity_per_unit,wastage_percent,notes,product:products(product_id,product_code,description),material:materials(material_code,material_name),uom:uoms(uom_code)').eq('active_status',true),s.from('product_routing_steps').select('routing_step_id,step_no,step_name,standard_minutes,instructions,product:products(product_id,product_code,description),group:machine_groups(group_name)').eq('active_status',true).order('step_no')]);for(const r of[products,materials,uoms,groups,bom,routes])if(r.error)throw r.error;return{products:products.data??[],materials:materials.data??[],uoms:uoms.data??[],groups:groups.data??[],bom:bom.data??[],routes:routes.data??[]}}
export async function addBomItem(input:Record<string,unknown>){const{data,error}=await client().rpc('add_product_bom_item',input);if(error)throw error;return data as string}
export async function addRoutingStep(input:Record<string,unknown>){const{data,error}=await client().rpc('add_product_routing_step',input);if(error)throw error;return data as string}
export async function listProductionPlanning(){const s=client();const[orders,groups]=await Promise.all([s.from('production_orders').select('production_order_id,production_order_no,status,target_quantity,priority,planned_start_date,planned_end_date,notes,product:products(product_code,description),group:machine_groups(machine_group_id,group_name),order_item:order_items(order:orders(order_no,customer:customers(customer_name)))').not('status','in','(CANCELLED,QC_PENDING)').order('planned_start_date',{ascending:true,nullsFirst:false}),s.from('machine_groups').select('machine_group_id,group_name').eq('active_status',true).order('display_order')]);for(const r of[orders,groups])if(r.error)throw r.error;return{orders:(orders.data??[])as unknown as any[],groups:groups.data??[]}}
export async function planProduction(input:Record<string,unknown>){const{data,error}=await client().rpc('plan_factory_production',input);if(error)throw error;return data as string}
export async function listMaterialIssueData(){const s=client();const[batches,materials,uoms,locations,issues]=await Promise.all([s.from('production_batches').select('production_batch_id,batch_code,status,machine:machines(machine_name),order:production_orders(production_order_no,product:products(description))').in('status',['ASSIGNED','SETUP','RUNNING']).order('created_at',{ascending:false}),s.from('materials').select('material_id,material_code,material_name').eq('active_status',true).order('material_code'),s.from('uoms').select('uom_id,uom_code').eq('active_status',true).order('uom_code'),s.from('locations').select('location_id,location_name').eq('active_status',true).order('location_name'),s.from('material_issues').select('material_issue_id,issue_no,issue_date,issued_by,received_by,status,batch:production_batches(batch_code,machine:machines(machine_name)),lines:material_issue_lines(quantity,material:materials(material_code,material_name),uom:uoms(uom_code),location:locations(location_name))').order('created_at',{ascending:false}).limit(30)]);for(const r of[batches,materials,uoms,locations,issues])if(r.error)throw r.error;return{batches:batches.data??[],materials:materials.data??[],uoms:uoms.data??[],locations:locations.data??[],issues:issues.data??[]}}
export async function issueMaterials(input:Record<string,unknown>){const{data,error}=await client().rpc('issue_factory_materials',input);if(error)throw error;return data as string}
export async function listDispatchScheduleData(){const s=client();const[goods,schedules]=await Promise.all([s.from('finished_goods').select('finished_goods_id,quantity,status,product:products(product_code,description),uom:uoms(uom_code),batch:production_batches(batch_code,order:production_orders(order_item:order_items(order:orders(customer:customers(customer_name)))))').eq('status','AVAILABLE'),s.from('dispatch_schedules').select('dispatch_schedule_id,schedule_no,scheduled_date,delivery_location,vehicle_no,driver_name,quantity,status,remarks,customer:customers(customer_name),goods:finished_goods(product:products(product_code,description),batch:production_batches(batch_code)),uom:uoms(uom_code)').order('scheduled_date')]);for(const r of[goods,schedules])if(r.error)throw r.error;return{goods:(goods.data??[])as unknown as any[],schedules:(schedules.data??[])as unknown as any[]}}
export async function scheduleDispatch(input:Record<string,unknown>){const{data,error}=await client().rpc('schedule_factory_dispatch',input);if(error)throw error;return data as string}
export async function listMaterialPlanning(){const s=client();const[orders,stock]=await Promise.all([s.from('production_orders').select('production_order_id,production_order_no,status,target_quantity,product:products(product_id,product_code,description,bom:product_bom_items(quantity_per_unit,wastage_percent,material:materials(material_id,material_code,material_name),uom:uoms(uom_id,uom_code)))').not('status','in','(CANCELLED,QC_PENDING)').order('created_at'),s.from('stock_ledger').select('material_id,uom_id,quantity,stock_category,ownership').not('material_id','is',null)]);for(const r of[orders,stock])if(r.error)throw r.error;return{orders:(orders.data??[])as unknown as any[],stock:stock.data??[]}}
export async function listStockTakeData(){const s=client();const[base,counts]=await Promise.all([listStockAdjustmentData(),s.from('stock_takes').select('stock_take_id,stock_take_no,count_date,book_quantity,physical_quantity,variance,counted_by,reason,status,product:products(product_code,description),material:materials(material_code,material_name),uom:uoms(uom_code),location:locations(location_name)').order('created_at',{ascending:false}).limit(30)]);if(counts.error)throw counts.error;return{...base,counts:counts.data??[]}}
export async function postStockTake(input:Record<string,unknown>){const{data,error}=await client().rpc('post_factory_stock_take',input);if(error)throw error;return data as string}
export async function listQualityAnalytics(days=30){const since=new Date(Date.now()-days*86400000).toISOString();const{data,error}=await client().from('qc_inspections').select('qc_inspection_id,inspection_date,inspection_type,overall_result,sample_size,created_at,batch:production_batches(batch_code,machine:machines(machine_name,legacy_machine_no),order:production_orders(product:products(product_code,description))),inspector:operators(full_name),defects:qc_defects(defect_type,defect_severity,quantity_affected,disposition)').gte('created_at',since).order('created_at',{ascending:false});if(error)throw error;return(data??[])as unknown as any[]}

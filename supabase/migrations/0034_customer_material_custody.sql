-- Customer-owned material custody and conversion ledger.
alter table public.stock_ledger add column if not exists customer_id uuid references public.customers(customer_id);
alter table public.grns add column if not exists customer_id uuid references public.customers(customer_id);
create index if not exists idx_stock_customer_item on public.stock_ledger(customer_id,material_id,product_id,transaction_date);

alter table public.stock_ledger drop constraint if exists stock_ledger_source_type;
alter table public.stock_ledger add constraint stock_ledger_source_type check(source_transaction_type in(
  'GRN','PRODUCTION_ENTRY','PACKING_RECORD','DISPATCH','ADJUSTMENT','OPENING_BALANCE','TRANSFER','MATERIAL_ISSUE',
  'CUSTOMER_MATERIAL_RECEIPT','OUTSOURCE_ISSUE','OUTSOURCE_RETURN','PRODUCTION_ISSUE','PRODUCTION_CONSUMPTION','PRODUCTION_WASTE','PRODUCTION_RECEIPT','CUSTOMER_DISPATCH'
));

create sequence if not exists public.seq_customer_custody start 1;
create table public.customer_custody_documents(
  custody_document_id uuid primary key default gen_random_uuid(),
  document_no text not null unique,
  transaction_type text not null check(transaction_type in('CUSTOMER_MATERIAL_RECEIPT','OUTSOURCE_ISSUE','OUTSOURCE_RETURN','PRODUCTION_ISSUE','PRODUCTION_RECONCILIATION','CUSTOMER_DISPATCH')),
  transaction_date date not null default current_date,
  customer_id uuid not null references public.customers(customer_id),
  reference text not null,
  party_name text,
  remarks text,
  created_at timestamptz not null default now(),created_by text not null default 'system'
);
create table public.customer_custody_lines(
  custody_line_id uuid primary key default gen_random_uuid(),
  custody_document_id uuid not null references public.customer_custody_documents(custody_document_id) on delete cascade,
  line_no int not null,
  material_id uuid references public.materials(material_id),product_id uuid references public.products(product_id),
  uom_id uuid not null references public.uoms(uom_id),location_id uuid not null references public.locations(location_id),
  movement_type text not null check(movement_type in('RECEIPT','TRANSFER_OUT','TRANSFER_IN','CONSUMPTION','WASTE','PRODUCTION_RECEIPT','DISPATCH')),
  quantity numeric not null check(quantity>0),ledger_entry_id uuid not null references public.stock_ledger(stock_ledger_id),remarks text,
  unique(custody_document_id,line_no),check((material_id is null)<>(product_id is null))
);
alter table public.customer_custody_documents enable row level security;
alter table public.customer_custody_lines enable row level security;
create policy factory_read_customer_custody_documents on public.customer_custody_documents for select using(has_factory_role(auth.uid()));
create policy factory_read_customer_custody_lines on public.customer_custody_lines for select using(has_factory_role(auth.uid()));

create or replace function public.post_customer_material_grn(p_customer uuid,p_supplier uuid,p_ownership text,p_driver text,p_vehicle text,p_lines jsonb,p_received_by text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_grn uuid;v_no text;v_location uuid;v_kg uuid;v_line jsonb;v_line_id uuid;v_count int:=0;
begin
 if not has_factory_role(auth.uid(),array['admin','store'])then raise exception'not authorized';end if;
 if p_customer is null then raise exception'customer is required for customer-owned material';end if;
 if p_ownership not in('CUSTOMER_OWNED','TOLL_MANUFACTURING')then raise exception'customer receipt requires customer or toll ownership';end if;
 if jsonb_typeof(p_lines)<>'array'or jsonb_array_length(p_lines)=0 then raise exception'at least one line is required';end if;
 select location_id into v_location from locations where location_code='WIP-FLOOR';select uom_id into v_kg from uoms where uom_code='KG';
 v_no:='CMR-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('seq_grn')::text,4,'0');
 insert into grns(grn_no,supplier_id,customer_id,driver_name,vehicle_no,ownership,status,received_by,created_by)
 values(v_no,p_supplier,p_customer,p_driver,p_vehicle,p_ownership,'POSTED',p_received_by,auth.uid()::text)returning grn_id into v_grn;
 for v_line in select value from jsonb_array_elements(p_lines)loop
  v_count:=v_count+1;if coalesce((v_line->>'total_weight')::numeric,0)<=0 then raise exception'line % requires total weight',v_count;end if;
  insert into grn_lines(grn_id,line_no,article_text_legacy,material_id,qty,total_weight,per_cone_wt,remarks,supplier_lot_no,created_by)
  values(v_grn,v_count,v_line->>'article',(v_line->>'material_id')::uuid,(v_line->>'qty')::numeric,(v_line->>'total_weight')::numeric,nullif(v_line->>'per_cone_wt','')::numeric,v_line->>'remarks',v_line->>'supplier_lot_no',auth.uid()::text)returning grn_line_id into v_line_id;
  insert into stock_ledger(material_id,customer_id,quantity,uom_id,location_id,ownership,stock_category,source_transaction_type,source_transaction_id,reference_note,created_by)
  values((v_line->>'material_id')::uuid,p_customer,(v_line->>'total_weight')::numeric,v_kg,v_location,p_ownership,'CUSTOMER_OWNED_MATERIAL','CUSTOMER_MATERIAL_RECEIPT',v_line_id,v_no,auth.uid()::text);
 end loop;return v_grn;
end$$;

create or replace function public.post_customer_custody(p_type text,p_customer uuid,p_reference text,p_party text,p_remarks text,p_lines jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_doc uuid;v_no text;v_line jsonb;v_n int:=0;v_qty numeric;v_signed numeric;v_balance numeric;v_ledger uuid;v_source text;v_kind text;v_material uuid;v_product uuid;v_uom uuid;v_location uuid;v_ownership text;
begin
 if not has_factory_role(auth.uid(),array['admin','store','production_manager'])then raise exception'not authorized';end if;
 if p_type not in('CUSTOMER_MATERIAL_RECEIPT','OUTSOURCE_ISSUE','OUTSOURCE_RETURN','PRODUCTION_ISSUE','PRODUCTION_RECONCILIATION','CUSTOMER_DISPATCH')then raise exception'invalid transaction type';end if;
 if p_customer is null or nullif(trim(p_reference),'')is null then raise exception'customer and reference are required';end if;
 if jsonb_typeof(p_lines)<>'array'or jsonb_array_length(p_lines)=0 then raise exception'at least one line is required';end if;
 if p_type in('OUTSOURCE_ISSUE','OUTSOURCE_RETURN','PRODUCTION_ISSUE')and(jsonb_array_length(p_lines)<>2 or (select count(distinct value->>'movement_type')from jsonb_array_elements(p_lines))<>2)then raise exception'transfer requires one transfer-out and one transfer-in line';end if;
 v_no:='CUST-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('seq_customer_custody')::text,4,'0');
 insert into customer_custody_documents(document_no,transaction_type,customer_id,reference,party_name,remarks,created_by)values(v_no,p_type,p_customer,trim(p_reference),nullif(trim(p_party),''),nullif(trim(p_remarks),''),auth.uid()::text)returning custody_document_id into v_doc;
 for v_line in select value from jsonb_array_elements(p_lines)loop
  v_n:=v_n+1;v_kind:=v_line->>'movement_type';v_qty:=(v_line->>'quantity')::numeric;v_material:=nullif(v_line->>'material_id','')::uuid;v_product:=nullif(v_line->>'product_id','')::uuid;v_uom:=(v_line->>'uom_id')::uuid;v_location:=(v_line->>'location_id')::uuid;v_ownership:=coalesce(nullif(v_line->>'ownership',''),'CUSTOMER_OWNED');
  if v_qty<=0 or(v_material is null)=(v_product is null)then raise exception'invalid line %',v_n;end if;
  if p_type='CUSTOMER_MATERIAL_RECEIPT'and v_kind<>'RECEIPT'then raise exception'invalid customer receipt movement';end if;
  if p_type='OUTSOURCE_ISSUE'and v_kind not in('TRANSFER_OUT','TRANSFER_IN')then raise exception'outsource issue must be a transfer';end if;
  if p_type='OUTSOURCE_RETURN'and v_kind not in('TRANSFER_OUT','TRANSFER_IN')then raise exception'outsource return must be a transfer';end if;
  if p_type='PRODUCTION_ISSUE'and v_kind not in('TRANSFER_OUT','TRANSFER_IN')then raise exception'production issue must be a transfer';end if;
  if p_type='PRODUCTION_RECONCILIATION'and v_kind not in('CONSUMPTION','WASTE','PRODUCTION_RECEIPT')then raise exception'invalid production movement';end if;
  if p_type='CUSTOMER_DISPATCH'and v_kind<>'DISPATCH'then raise exception'invalid dispatch movement';end if;
  v_signed:=case when v_kind in('TRANSFER_OUT','CONSUMPTION','WASTE','DISPATCH')then-v_qty else v_qty end;
  if v_signed<0 then select coalesce(sum(quantity),0)into v_balance from stock_ledger where customer_id=p_customer and material_id is not distinct from v_material and product_id is not distinct from v_product and uom_id=v_uom and location_id=v_location and ownership=v_ownership;if v_balance<v_qty then raise exception'insufficient customer stock on line % (available: %)',v_n,v_balance;end if;end if;
  v_source:=case when p_type='PRODUCTION_RECONCILIATION'then v_kind else p_type end;
  insert into stock_ledger(material_id,product_id,customer_id,quantity,uom_id,location_id,ownership,stock_category,source_transaction_type,source_transaction_id,reference_note,created_by)
  values(v_material,v_product,p_customer,v_signed,v_uom,v_location,v_ownership,case when v_product is not null then'FINISHED_GOODS'else'CUSTOMER_OWNED_MATERIAL'end,v_source,v_doc,v_no||' · '||p_reference,auth.uid()::text)returning stock_ledger_id into v_ledger;
  insert into customer_custody_lines(custody_document_id,line_no,material_id,product_id,uom_id,location_id,movement_type,quantity,ledger_entry_id,remarks)values(v_doc,v_n,v_material,v_product,v_uom,v_location,v_kind,v_qty,v_ledger,v_line->>'remarks');
 end loop;
 if p_type in('OUTSOURCE_ISSUE','OUTSOURCE_RETURN','PRODUCTION_ISSUE')and exists(select 1 from customer_custody_lines a join customer_custody_lines b on b.custody_document_id=a.custody_document_id and b.line_no<>a.line_no where a.custody_document_id=v_doc and(a.material_id is distinct from b.material_id or a.product_id is distinct from b.product_id or a.uom_id<>b.uom_id or a.quantity<>b.quantity))then raise exception'transfer lines must have the same item, unit and quantity';end if;
 return v_doc;
end$$;
grant execute on function public.post_customer_material_grn(uuid,uuid,text,text,text,jsonb,text)to authenticated;
grant execute on function public.post_customer_custody(text,uuid,text,text,text,jsonb)to authenticated;

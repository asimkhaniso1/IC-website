-- Physical stock counts reconciled through append-only variance entries.
create sequence if not exists public.seq_stock_take start 1;
create table public.stock_takes(
 stock_take_id uuid primary key default gen_random_uuid(),stock_take_no text not null unique,count_date date not null default current_date,
 product_id uuid references public.products(product_id),material_id uuid references public.materials(material_id),uom_id uuid not null references public.uoms(uom_id),location_id uuid not null references public.locations(location_id),
 ownership text not null,stock_category text not null,book_quantity numeric not null,physical_quantity numeric not null,variance numeric not null,
 counted_by text not null,reason text,status text not null default 'POSTED' check(status in('POSTED','VOID')),
 ledger_entry_id uuid references public.stock_ledger(stock_ledger_id),created_at timestamptz not null default now(),created_by text not null default 'system',
 check((product_id is not null and material_id is null)or(material_id is not null and product_id is null))
);
create or replace function public.post_factory_stock_take(p_product uuid,p_material uuid,p_uom uuid,p_location uuid,p_ownership text,p_category text,p_physical numeric,p_counted_by text,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_ledger uuid;v_book numeric;v_variance numeric;v_no text;
begin
 if not has_factory_role(auth.uid(),array['admin','store']) then raise exception 'not authorized';end if;
 if (p_product is null)=(p_material is null) then raise exception 'select exactly one product or material';end if;
 if p_physical is null or p_physical<0 then raise exception 'physical quantity cannot be negative';end if;
 if nullif(trim(p_counted_by),'') is null then raise exception 'counter name is required';end if;
 if nullif(trim(p_reason),'') is null then raise exception 'count reason is required';end if;
 select coalesce(sum(quantity),0) into v_book from stock_ledger where product_id is not distinct from p_product and material_id is not distinct from p_material and uom_id=p_uom and location_id=p_location and ownership=p_ownership and stock_category=p_category;
 v_variance:=p_physical-v_book;v_no:='ST-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('seq_stock_take')::text,4,'0');
 if v_variance<>0 then insert into stock_ledger(product_id,material_id,quantity,uom_id,location_id,ownership,stock_category,source_transaction_type,reference_note,created_by)values(p_product,p_material,v_variance,p_uom,p_location,p_ownership,p_category,'ADJUSTMENT','Stock take '||v_no||': '||p_reason,auth.uid()::text)returning stock_ledger_id into v_ledger;end if;
 insert into stock_takes(stock_take_no,product_id,material_id,uom_id,location_id,ownership,stock_category,book_quantity,physical_quantity,variance,counted_by,reason,ledger_entry_id,created_by)values(v_no,p_product,p_material,p_uom,p_location,p_ownership,p_category,v_book,p_physical,v_variance,p_counted_by,p_reason,v_ledger,auth.uid()::text)returning stock_take_id into v_id;
 insert into audit_log(user_id,action,entity_type,entity_id,new_value,reason)values(auth.uid(),'Stock Take Posted','stock_takes',v_id,jsonb_build_object('stock_take_no',v_no,'book_quantity',v_book,'physical_quantity',p_physical,'variance',v_variance,'ledger_entry_id',v_ledger),p_reason);return v_id;
end $$;
alter table public.stock_takes enable row level security;
create policy factory_read_stock_takes on public.stock_takes for select using(has_factory_role(auth.uid(),array['admin','store','accounts','viewer']));
grant execute on function public.post_factory_stock_take(uuid,uuid,uuid,uuid,text,text,numeric,text,text) to authenticated;

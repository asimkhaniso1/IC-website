-- Atomic transfers between factory locations.
alter table public.stock_ledger drop constraint if exists stock_ledger_source_type;
alter table public.stock_ledger add constraint stock_ledger_source_type check(source_transaction_type in ('GRN','PRODUCTION_ENTRY','ADJUSTMENT','OPENING_BALANCE','TRANSFER'));
create or replace function public.transfer_factory_stock(p_product uuid,p_material uuid,p_uom uuid,p_from_location uuid,p_to_location uuid,p_ownership text,p_category text,p_quantity numeric,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_out uuid;v_in uuid;v_balance numeric;v_transfer uuid:=gen_random_uuid();
begin
 if not has_factory_role(auth.uid(),array['admin','store']) then raise exception 'not authorized';end if;
 if (p_product is null)=(p_material is null) then raise exception 'select exactly one product or material';end if;
 if p_from_location=p_to_location then raise exception 'source and destination must be different';end if;
 if p_quantity is null or p_quantity<=0 then raise exception 'transfer quantity must be greater than zero';end if;
 if nullif(trim(p_reason),'') is null then raise exception 'transfer reason is required';end if;
 select coalesce(sum(quantity),0) into v_balance from stock_ledger where product_id is not distinct from p_product and material_id is not distinct from p_material and uom_id=p_uom and location_id=p_from_location and ownership=p_ownership and stock_category=p_category;
 if v_balance<p_quantity then raise exception 'insufficient stock (available: %)',v_balance;end if;
 insert into stock_ledger(product_id,material_id,quantity,uom_id,location_id,ownership,stock_category,source_transaction_type,source_transaction_id,reference_note,created_by) values(p_product,p_material,-p_quantity,p_uom,p_from_location,p_ownership,p_category,'TRANSFER',v_transfer,p_reason,auth.uid()::text) returning stock_ledger_id into v_out;
 insert into stock_ledger(product_id,material_id,quantity,uom_id,location_id,ownership,stock_category,source_transaction_type,source_transaction_id,reference_note,created_by) values(p_product,p_material,p_quantity,p_uom,p_to_location,p_ownership,p_category,'TRANSFER',v_transfer,p_reason,auth.uid()::text) returning stock_ledger_id into v_in;
 insert into audit_log(user_id,action,entity_type,entity_id,new_value,reason) values(auth.uid(),'Stock Transfer','stock_ledger',v_transfer,jsonb_build_object('quantity',p_quantity,'from_location',p_from_location,'to_location',p_to_location,'out_entry',v_out,'in_entry',v_in,'product_id',p_product,'material_id',p_material),p_reason);
 return v_transfer;
end $$;
grant execute on function public.transfer_factory_stock(uuid,uuid,uuid,uuid,uuid,text,text,numeric,text) to authenticated;

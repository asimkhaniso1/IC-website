-- Controlled, append-only stock corrections.
create or replace function public.adjust_factory_stock(p_product uuid,p_material uuid,p_uom uuid,p_location uuid,p_ownership text,p_category text,p_quantity numeric,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_balance numeric;
begin
 if not has_factory_role(auth.uid(),array['admin','store']) then raise exception 'not authorized';end if;
 if (p_product is null)=(p_material is null) then raise exception 'select exactly one product or material';end if;
 if p_quantity is null or p_quantity=0 then raise exception 'adjustment quantity cannot be zero';end if;
 if nullif(trim(p_reason),'') is null then raise exception 'adjustment reason is required';end if;
 select coalesce(sum(quantity),0) into v_balance from stock_ledger where product_id is not distinct from p_product and material_id is not distinct from p_material and uom_id=p_uom and location_id=p_location and ownership=p_ownership and stock_category=p_category;
 if v_balance+p_quantity<0 then raise exception 'adjustment would create negative stock (available: %)',v_balance;end if;
 insert into stock_ledger(product_id,material_id,quantity,uom_id,location_id,ownership,stock_category,source_transaction_type,reference_note,created_by)
 values(p_product,p_material,p_quantity,p_uom,p_location,p_ownership,p_category,'ADJUSTMENT',p_reason,auth.uid()::text) returning stock_ledger_id into v_id;
 insert into audit_log(user_id,action,entity_type,entity_id,new_value,reason) values(auth.uid(),'Stock Adjustment','stock_ledger',v_id,jsonb_build_object('quantity',p_quantity,'balance_before',v_balance,'balance_after',v_balance+p_quantity,'product_id',p_product,'material_id',p_material,'location_id',p_location),p_reason);
 return v_id;
end $$;
grant execute on function public.adjust_factory_stock(uuid,uuid,uuid,uuid,text,text,numeric,text) to authenticated;

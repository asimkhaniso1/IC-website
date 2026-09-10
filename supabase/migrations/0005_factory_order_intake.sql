-- Factory Live Phase 1: atomic manual order intake for the first live trial.

create sequence if not exists public.seq_factory_order start 1;
create sequence if not exists public.seq_production_order start 1;

create or replace function public.create_factory_order(
  p_customer uuid,
  p_product uuid,
  p_quantity numeric,
  p_notes text default null,
  p_order_date date default current_date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
  v_item uuid;
  v_production_order uuid;
  v_uom uuid;
  v_order_no text;
  v_production_no text;
begin
  if not has_factory_role(auth.uid(), array['admin','production_manager']) then
    raise exception 'not authorized';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be greater than zero';
  end if;

  select uom_id into v_uom from uoms where uom_code = 'MTR';
  if v_uom is null then raise exception 'MTR unit is not configured'; end if;

  v_order_no := 'FO-' || to_char(p_order_date, 'YYYYMMDD') || '-' || lpad(nextval('seq_factory_order')::text, 4, '0');
  v_production_no := 'PO-' || to_char(p_order_date, 'YYYYMMDD') || '-' || lpad(nextval('seq_production_order')::text, 4, '0');

  insert into orders(order_no, customer_id, order_date, order_channel, status, notes, created_by)
  values(v_order_no, p_customer, p_order_date, 'MANUAL', 'ORDER_CONFIRMED', p_notes, auth.uid()::text)
  returning order_id into v_order;

  insert into order_items(order_id, product_id, quantity, uom_id, notes, created_by)
  values(v_order, p_product, p_quantity, v_uom, p_notes, auth.uid()::text)
  returning order_item_id into v_item;

  insert into production_orders(production_order_no, order_item_id, product_id, status,
    target_quantity, uom_id, priority, notes, created_by)
  values(v_production_no, v_item, p_product, 'ORDER_CONFIRMED', p_quantity, v_uom, 'NORMAL', p_notes, auth.uid()::text)
  returning production_order_id into v_production_order;

  insert into audit_log(user_id, action, entity_type, entity_id, new_value)
  values(auth.uid(), 'Order Confirmed', 'orders', v_order,
    jsonb_build_object('order_no', v_order_no, 'production_order_id', v_production_order));
  insert into audit_log(user_id, action, entity_type, entity_id, new_value)
  values(auth.uid(), 'Production Order Created', 'production_orders', v_production_order,
    jsonb_build_object('production_order_no', v_production_no, 'target_quantity', p_quantity));

  return v_production_order;
end $$;

grant execute on function public.create_factory_order(uuid,uuid,numeric,text,date) to authenticated;

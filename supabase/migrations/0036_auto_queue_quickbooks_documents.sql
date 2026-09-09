-- Automatically stage issued commercial documents for QuickBooks Desktop.
-- Master records are queued first so references exist before each transaction.
create or replace function public.auto_queue_qb_estimate()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status in('SENT','ACCEPTED')then
    insert into quickbooks_sync_queue(entity_type,entity_id,created_by)
    values('CUSTOMER',new.customer_id,coalesce(new.created_by,'system')) on conflict do nothing;
    insert into quickbooks_sync_queue(entity_type,entity_id,created_by)
    values('ITEM',new.product_id,coalesce(new.created_by,'system')) on conflict do nothing;
    insert into quickbooks_sync_queue(entity_type,entity_id,created_by)
    values('ESTIMATE',new.quotation_id,coalesce(new.created_by,'system')) on conflict do nothing;
  end if;
  return new;
end$$;

create or replace function public.auto_queue_qb_purchase_order()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status in('ISSUED','PART_RECEIVED','RECEIVED')then
    insert into quickbooks_sync_queue(entity_type,entity_id,created_by)
    values('VENDOR',new.supplier_id,coalesce(new.created_by,'system')) on conflict do nothing;
    insert into quickbooks_sync_queue(entity_type,entity_id,created_by)
    values('PURCHASE_ORDER',new.purchase_order_id,coalesce(new.created_by,'system')) on conflict do nothing;
  end if;
  return new;
end$$;

drop trigger if exists trg_auto_queue_qb_estimate on public.factory_quotations;
create trigger trg_auto_queue_qb_estimate after insert or update of status on public.factory_quotations
for each row when(new.status in('SENT','ACCEPTED'))execute function public.auto_queue_qb_estimate();

drop trigger if exists trg_auto_queue_qb_purchase_order on public.purchase_orders;
create trigger trg_auto_queue_qb_purchase_order after insert or update of status on public.purchase_orders
for each row when(new.status in('ISSUED','PART_RECEIVED','RECEIVED'))execute function public.auto_queue_qb_purchase_order();

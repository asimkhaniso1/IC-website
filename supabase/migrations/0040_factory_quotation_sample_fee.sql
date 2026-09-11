-- The sample development charge was only ever visible internally, on the
-- factory costing sheet (quote_costing_lines) — the commercial quotation the
-- customer actually receives (factory_quotations) had no field for it at
-- all. Add it as its own column, and a v2 issuing function that carries it
-- through, so accounts can put it on the quotation as a distinct line
-- instead of folding it silently into the unit rate.

alter table public.factory_quotations
  add column if not exists sample_development_fee numeric not null default 0 check (sample_development_fee >= 0);

create or replace function public.create_factory_quotation_v2(p_rfq uuid,p_customer uuid,p_product uuid,p_quantity numeric,p_unit_rate numeric,p_currency text,p_valid_until date,p_terms text default null,p_sample_fee numeric default 0)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if coalesce(p_sample_fee,0)<0 then raise exception 'sample development fee cannot be negative'; end if;
  v_id:=public.create_factory_quotation(p_rfq,p_customer,p_product,p_quantity,p_unit_rate,p_currency,p_valid_until,p_terms);
  update public.factory_quotations set sample_development_fee=coalesce(p_sample_fee,0) where quotation_id=v_id;
  return v_id;
end $$;

revoke all on function public.create_factory_quotation_v2(uuid,uuid,uuid,numeric,numeric,text,date,text,numeric) from public;
grant execute on function public.create_factory_quotation_v2(uuid,uuid,uuid,numeric,numeric,text,date,text,numeric) to authenticated;

-- Allow a submitted sample request to proceed into commercial quotation after development/costing.
create or replace function public.list_factory_quote_sources()returns table(rfq_id uuid,design_project_id uuid,design_code text,design_name text,family text,revision_no int,contact_name text,company text,email text,quantity text,quantity_unit text,target_price text,target_date date)language sql stable security definer set search_path=public as $$
select r.id,p.id,p.design_code,p.name,p.family::text,p.current_revision,r.contact_name,r.company,r.email,r.quantity,r.quantity_unit,r.target_price,r.target_date
from rfqs r join design_projects p on p.id=r.project_id
where has_factory_role(auth.uid(),array['admin','production_manager','accounts','viewer'])
  and r.kind in('quote','sample')
  and r.status in('Submitted','Under Review','Sample Development','Sample Ready','Sample Sent','Sample Approved')
  and not exists(select 1 from factory_quotations q where q.rfq_id=r.id)
order by r.created_at;
$$;

create or replace function public.create_factory_quotation(p_rfq uuid,p_customer uuid,p_product uuid,p_quantity numeric,p_unit_rate numeric,p_currency text,p_valid_until date,p_terms text default null)returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_project uuid;v_code text;v_name text;v_no text;
begin
  if not has_factory_role(auth.uid(),array['admin','production_manager','accounts'])then raise exception'not authorized';end if;
  if p_quantity<=0 or p_unit_rate<0 then raise exception'invalid quantity or rate';end if;
  if p_valid_until<current_date then raise exception'valid until date cannot be in the past';end if;
  select p.id,p.design_code,p.name into v_project,v_code,v_name from rfqs r join design_projects p on p.id=r.project_id
  where r.id=p_rfq and r.kind in('quote','sample') and r.status in('Submitted','Under Review','Sample Development','Sample Ready','Sample Sent','Sample Approved') for update of r,p;
  if not found then raise exception'quotation source request is unavailable';end if;
  v_no:='QT-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('seq_factory_quotation')::text,4,'0');
  insert into factory_quotations(quotation_no,rfq_id,design_project_id,design_code,design_name,customer_id,product_id,quantity,unit_rate,currency,valid_until,terms,created_by)
  values(v_no,p_rfq,v_project,v_code,v_name,p_customer,p_product,p_quantity,p_unit_rate,upper(coalesce(nullif(trim(p_currency),''),'PKR')),p_valid_until,nullif(trim(p_terms),''),auth.uid()::text)returning quotation_id into v_id;
  update rfqs set status='Quoted'where id=p_rfq;
  update design_projects set status='Quoted',updated_at=now()where id=v_project;
  insert into audit_log(user_id,action,entity_type,entity_id,new_value)values(auth.uid(),'Quotation Issued','factory_quotations',v_id,jsonb_build_object('quotation_no',v_no,'design_code',v_code,'amount',p_quantity*p_unit_rate));
  return v_id;
end$$;

revoke all on function public.list_factory_quote_sources()from public;
revoke all on function public.create_factory_quotation(uuid,uuid,uuid,numeric,numeric,text,date,text)from public;
grant execute on function public.list_factory_quote_sources()to authenticated;
grant execute on function public.create_factory_quotation(uuid,uuid,uuid,numeric,numeric,text,date,text)to authenticated;

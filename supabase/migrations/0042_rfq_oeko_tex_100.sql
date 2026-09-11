-- Capture whether the customer needs OEKO-TEX Standard 100 certified
-- quality, right at RFQ submission (sample or quote), and carry it through
-- to the physical Sample Development record so factory staff see it
-- throughout the sample's lifecycle, not just at the moment of picking the
-- request from the dropdown.

alter table public.rfqs
  add column if not exists oeko_tex_100 boolean not null default false;

alter table public.factory_samples
  add column if not exists oeko_tex_100 boolean not null default false;

-- submit_rfq() already inserts every other RfqInput field from the p_rfq
-- jsonb payload; rather than touching that original function, follow the
-- codebase's _v2 convention: delegate to it, then set the one new column.
create or replace function public.submit_rfq_v2(p_project uuid, p_token uuid, p_rfq jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
  v_rfq_id uuid;
begin
  v_result := public.submit_rfq(p_project, p_token, p_rfq);
  if coalesce((v_result->>'ok')::boolean, false) then
    v_rfq_id := (v_result->>'rfqId')::uuid;
    update public.rfqs
    set oeko_tex_100 = coalesce((p_rfq->>'oekoTex100')::boolean, false)
    where id = v_rfq_id;
  end if;
  return v_result;
end $$;

revoke all on function public.submit_rfq_v2(uuid, uuid, jsonb) from public;
grant execute on function public.submit_rfq_v2(uuid, uuid, jsonb) to anon, authenticated;

-- list_factory_sample_sources_v2() needs an extra output column
-- (oeko_tex_100) so the "Sample request…" dropdown can flag it — a
-- RETURNS TABLE shape change requires drop + recreate, not
-- create-or-replace. Purely additive/read-only, so safe regardless of
-- migration/deploy ordering.
drop function if exists public.list_factory_sample_sources_v2();

create function public.list_factory_sample_sources_v2()
returns table(rfq_id uuid,design_project_id uuid,design_code text,design_name text,family text,revision_no int,contact_name text,company text,email text,quantity text,quantity_unit text,target_date date,application text,message text,oeko_tex_100 boolean)
language sql stable security definer set search_path=public as $$
  select r.id,p.id,p.design_code,p.name,p.family::text,dr.revision_no,r.contact_name,r.company,r.email,r.quantity,r.quantity_unit,r.target_date,r.application,r.message,r.oeko_tex_100
  from public.rfqs r join public.design_projects p on p.id=r.project_id join public.design_revisions dr on dr.id=r.revision_id
  join public.quote_costings c on c.rfq_id=r.id and c.status='FINAL' and c.sample_required
  where public.has_factory_role(auth.uid(),array['admin','production_manager','quality','viewer']) and r.status='Under Review'
    and not exists(select 1 from public.factory_samples s where s.rfq_id=r.id) order by r.created_at;
$$;

revoke all on function public.list_factory_sample_sources_v2() from public;
grant execute on function public.list_factory_sample_sources_v2() to authenticated;

-- create_factory_sample_v3(): same as v2, plus copying oeko_tex_100 from
-- the source RFQ onto the created factory_samples row.
create or replace function public.create_factory_sample_v3(p_rfq uuid,p_assigned_to text,p_target_date date default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_no text;r record;
begin
  if not public.has_factory_role(auth.uid(),array['admin','production_manager','quality']) then raise exception 'not authorized'; end if;
  if nullif(trim(p_assigned_to),'') is null then raise exception 'assigned person is required'; end if;
  select q.*,p.id project_id,p.design_code,p.name design_name,dr.revision_no into r from public.rfqs q
  join public.design_projects p on p.id=q.project_id join public.design_revisions dr on dr.id=q.revision_id
  join public.quote_costings c on c.rfq_id=q.id and c.status='FINAL' and c.sample_required
  where q.id=p_rfq and q.status='Under Review' for update of q,p;
  if not found then raise exception 'sample request is unavailable'; end if;
  v_no:='SMP-'||to_char(current_date,'YYYYMMDD')||'-'||lpad(nextval('public.seq_factory_sample')::text,4,'0');
  insert into public.factory_samples(sample_no,rfq_id,design_project_id,design_code,design_name,revision_no,contact_name,company,email,requested_quantity,target_date,assigned_to,notes,oeko_tex_100,created_by)
  values(v_no,p_rfq,r.project_id,r.design_code,r.design_name,r.revision_no,r.contact_name,r.company,r.email,concat_ws(' ',r.quantity,r.quantity_unit),coalesce(p_target_date,r.target_date),trim(p_assigned_to),nullif(trim(p_notes),''),r.oeko_tex_100,auth.uid()::text) returning sample_id into v_id;
  update public.rfqs set status='Sample Development' where id=p_rfq;
  update public.design_projects set status='Sample Development',updated_at=now() where id=r.project_id;
  return v_id;
end $$;

revoke all on function public.create_factory_sample_v3(uuid,text,date,text) from public;
grant execute on function public.create_factory_sample_v3(uuid,text,date,text) to authenticated;

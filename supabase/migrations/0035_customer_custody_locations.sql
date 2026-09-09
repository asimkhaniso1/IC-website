-- Standard locations used by customer-owned conversion stock.
insert into public.locations(location_code,location_name,location_type,notes)
values
 ('RM-STORE','Raw Material Store','RAW_MATERIAL_STORE','Customer-owned and company-owned raw material held at the factory'),
 ('OUT-DYE','At Dyer','OTHER','Customer material temporarily held by an outside dyeing processor'),
 ('OUT-PRINT','At Printer','OTHER','Customer material temporarily held by an outside printing processor'),
 ('PROD-FLOOR','Production Floor','WIP','Material issued to production and awaiting consumption reconciliation')
on conflict(location_code)do update set
 location_name=excluded.location_name,
 location_type=excluded.location_type,
 notes=excluded.notes,
 active_status=true,
 updated_at=now();

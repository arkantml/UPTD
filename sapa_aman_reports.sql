-- SAPA AMAN: anonymous reports and staff-only case management.
-- Run once in the Supabase SQL Editor. Add staff user IDs after creating their Auth accounts.

create extension if not exists pgcrypto with schema extensions;

do $$
begin
    create type public.sapa_aman_report_status as enum (
        'received',
        'reviewing',
        'in_progress',
        'referred',
        'closed'
    );
exception
    when duplicate_object then null;
end
$$;

create table if not exists public.sapa_aman_staff (
    user_id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null,
    role text not null default 'case_worker'
        check (role in ('case_worker', 'supervisor', 'admin')),
    created_at timestamptz not null default now()
);

create table if not exists public.sapa_aman_reports (
    id uuid primary key default gen_random_uuid(),
    tracking_code text not null unique,
    access_pin_hash bytea not null,
    category text not null,
    narrative text not null
        check (char_length(trim(narrative)) between 10 and 12000),
    is_anonymous boolean not null default true,
    reporter_name text,
    reporter_contact text,
    reporter_role text not null default 'community',
    needs text[] not null default '{}',
    safe_time text,
    status public.sapa_aman_report_status not null default 'received',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.sapa_aman_reports
    add column if not exists is_anonymous boolean not null default true,
    add column if not exists reporter_name text,
    add column if not exists reporter_contact text,
    add column if not exists reporter_role text not null default 'community',
    add column if not exists needs text[] not null default '{}',
    add column if not exists safe_time text;

alter table public.sapa_aman_reports
    drop constraint if exists sapa_aman_reports_category_check;

alter table public.sapa_aman_reports
    add constraint sapa_aman_reports_category_check
    check (category in (
        'violence',
        'domestic_violence',
        'child_protection',
        'other',
        'kdrt',
        'anak',
        'seksual',
        'penelantaran',
        'tppo',
        'cyber',
        'lainnya'
    ));

alter table public.sapa_aman_reports
    drop constraint if exists sapa_aman_reports_reporter_role_check;

alter table public.sapa_aman_reports
    add constraint sapa_aman_reports_reporter_role_check
    check (reporter_role in ('victim', 'family', 'witness', 'community'));

create table if not exists public.sapa_aman_report_status_history (
    id bigint generated always as identity primary key,
    report_id uuid not null references public.sapa_aman_reports (id) on delete cascade,
    previous_status public.sapa_aman_report_status,
    new_status public.sapa_aman_report_status not null,
    note text check (note is null or char_length(note) <= 2000),
    changed_by uuid references auth.users (id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists sapa_aman_reports_created_at_idx
    on public.sapa_aman_reports (created_at desc);

create index if not exists sapa_aman_report_history_report_id_idx
    on public.sapa_aman_report_status_history (report_id, created_at desc);

create or replace function public.sapa_aman_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists sapa_aman_reports_set_updated_at
    on public.sapa_aman_reports;

create trigger sapa_aman_reports_set_updated_at
before update on public.sapa_aman_reports
for each row execute function public.sapa_aman_set_updated_at();

alter table public.sapa_aman_staff enable row level security;
alter table public.sapa_aman_reports enable row level security;
alter table public.sapa_aman_report_status_history enable row level security;

drop policy if exists "Staff can read their own staff record"
    on public.sapa_aman_staff;
create policy "Staff can read their own staff record"
    on public.sapa_aman_staff
    for select
    to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "Staff can read reports"
    on public.sapa_aman_reports;
create policy "Staff can read reports"
    on public.sapa_aman_reports
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.sapa_aman_staff as staff
            where staff.user_id = (select auth.uid())
        )
    );

drop policy if exists "Staff can read report status history"
    on public.sapa_aman_report_status_history;
create policy "Staff can read report status history"
    on public.sapa_aman_report_status_history
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.sapa_aman_staff as staff
            where staff.user_id = (select auth.uid())
        )
    );

revoke all on table public.sapa_aman_staff
    from anon, authenticated;
revoke all on table public.sapa_aman_reports
    from anon, authenticated;
revoke all on table public.sapa_aman_report_status_history
    from anon, authenticated;

grant select on table public.sapa_aman_staff
    to authenticated;
grant select on table public.sapa_aman_reports
    to authenticated;
grant select on table public.sapa_aman_report_status_history
    to authenticated;

drop function if exists public.sapa_aman_submit_report(text, text);
drop function if exists public.sapa_aman_submit_report(
    text, text, boolean, text, text, text, text[], text
);

create function public.sapa_aman_submit_report(
    p_category text,
    p_narrative text,
    p_is_anonymous boolean,
    p_reporter_name text,
    p_reporter_contact text,
    p_reporter_role text,
    p_needs text[],
    p_safe_time text
)
returns table (
    tracking_code text,
    access_pin text,
    status public.sapa_aman_report_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_tracking_code text;
    v_access_pin text;
    v_report_id uuid;
begin
    if p_category is null or p_category not in (
        'violence', 'domestic_violence', 'child_protection', 'other',
        'kdrt', 'anak', 'seksual', 'penelantaran', 'tppo', 'cyber', 'lainnya'
    ) then
        raise exception 'Kategori laporan tidak valid.';
    end if;

    if p_narrative is null
        or char_length(trim(p_narrative)) not between 10 and 12000 then
        raise exception 'Isi laporan harus terdiri dari 10 sampai 12000 karakter.';
    end if;

    if p_is_anonymous is null then
        raise exception 'Pilihan identitas pelapor wajib diisi.';
    end if;

    if not p_is_anonymous
        and (p_reporter_name is null or char_length(trim(p_reporter_name)) = 0) then
        raise exception 'Nama pelapor wajib diisi jika memilih identitas terbuka.';
    end if;

    if p_reporter_name is not null and char_length(trim(p_reporter_name)) > 200 then
        raise exception 'Nama pelapor tidak boleh melebihi 200 karakter.';
    end if;

    if p_reporter_contact is null
        or char_length(trim(p_reporter_contact)) not between 3 and 250 then
        raise exception 'Kontak aman wajib diisi dengan format yang valid.';
    end if;

    if p_reporter_role is null or p_reporter_role not in (
        'victim', 'family', 'witness', 'community'
    ) then
        raise exception 'Status pelapor tidak valid.';
    end if;

    if p_safe_time is not null and char_length(trim(p_safe_time)) > 500 then
        raise exception 'Catatan waktu aman tidak boleh melebihi 500 karakter.';
    end if;

    if cardinality(coalesce(p_needs, '{}')) > 4
        or exists (
            select 1
            from unnest(coalesce(p_needs, '{}')) as needs(value)
            where value not in ('Medis', 'Psikologis', 'Hukum', 'Shelter', 'medis', 'psikologis', 'hukum', 'shelter')
        ) then
        raise exception 'Pilihan kebutuhan bantuan tidak valid.';
    end if;

    v_tracking_code := 'SAPA-' || upper(substr(encode(extensions.gen_random_bytes(16), 'hex'), 1, 16));
    v_access_pin := upper(encode(extensions.gen_random_bytes(16), 'hex'));

    insert into public.sapa_aman_reports (
        tracking_code,
        access_pin_hash,
        category,
        narrative,
        is_anonymous,
        reporter_name,
        reporter_contact,
        reporter_role,
        needs,
        safe_time
    )
    values (
        v_tracking_code,
        extensions.digest(v_access_pin, 'sha256'),
        p_category,
        trim(p_narrative),
        p_is_anonymous,
        nullif(trim(p_reporter_name), ''),
        trim(p_reporter_contact),
        p_reporter_role,
        coalesce(p_needs, '{}'),
        nullif(trim(p_safe_time), '')
    )
    returning id into v_report_id;

    insert into public.sapa_aman_report_status_history (
        report_id,
        previous_status,
        new_status
    )
    values (
        v_report_id,
        null,
        'received'
    );

    return query
    select v_tracking_code, v_access_pin, 'received'::public.sapa_aman_report_status;
end;
$$;

create or replace function public.sapa_aman_check_report_status(
    p_tracking_code text,
    p_access_pin text
)
returns table (
    status public.sapa_aman_report_status,
    received_at timestamptz,
    updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
    select report.status, report.created_at, report.updated_at
    from public.sapa_aman_reports as report
    where report.tracking_code = upper(trim(p_tracking_code))
      and report.access_pin_hash = extensions.digest(upper(trim(p_access_pin)), 'sha256')
    limit 1;
$$;

create or replace function public.sapa_aman_update_report_status(
    p_tracking_code text,
    p_new_status public.sapa_aman_report_status,
    p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_report_id uuid;
    v_previous_status public.sapa_aman_report_status;
    v_actor_id uuid := auth.uid();
begin
    if v_actor_id is null or not exists (
        select 1
        from public.sapa_aman_staff as staff
        where staff.user_id = v_actor_id
    ) then
        raise exception 'Akses petugas diperlukan.';
    end if;

    if p_note is not null and char_length(p_note) > 2000 then
        raise exception 'Catatan tidak boleh melebihi 2000 karakter.';
    end if;

    select report.id, report.status
    into v_report_id, v_previous_status
    from public.sapa_aman_reports as report
    where report.tracking_code = upper(trim(p_tracking_code))
    for update;

    if not found then
        raise exception 'Laporan tidak ditemukan.';
    end if;

    if v_previous_status = p_new_status then
        raise exception 'Status laporan sudah menggunakan nilai tersebut.';
    end if;

    update public.sapa_aman_reports
    set status = p_new_status
    where id = v_report_id;

    insert into public.sapa_aman_report_status_history (
        report_id,
        previous_status,
        new_status,
        note,
        changed_by
    )
    values (
        v_report_id,
        v_previous_status,
        p_new_status,
        nullif(trim(p_note), ''),
        v_actor_id
    );
end;
$$;

revoke all on function public.sapa_aman_set_updated_at()
    from public, anon, authenticated;
revoke all on function public.sapa_aman_submit_report(
    text, text, boolean, text, text, text, text[], text
)
    from public, anon, authenticated;
revoke all on function public.sapa_aman_check_report_status(text, text)
    from public, anon, authenticated;
revoke all on function public.sapa_aman_update_report_status(text, public.sapa_aman_report_status, text)
    from public, anon, authenticated;

grant execute on function public.sapa_aman_submit_report(
    text, text, boolean, text, text, text, text[], text
)
    to anon, authenticated;
grant execute on function public.sapa_aman_check_report_status(text, text)
    to anon, authenticated;
grant execute on function public.sapa_aman_update_report_status(text, public.sapa_aman_report_status, text)
    to authenticated;
--
-- Public submission RPC returns the tracking code and PIN once. Show both to the reporter;
-- never log, email, or expose the PIN from a public status response.

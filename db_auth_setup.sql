-- 1. Garante extensões necessárias
create extension if not exists pgcrypto schema extensions;

-- 2. Recria a função de criar usuário COMPLETA (Users + Identities + Profiles)
create or replace function public.create_new_user(
  email text,
  password text,
  nome text,
  perfil text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_id uuid;
  encrypted_pw text;
begin
  -- Normaliza email
  email := lower(email);
  
  -- Verifica duplicidade
  if exists (select 1 from auth.users where auth.users.email = create_new_user.email) then
    raise exception 'Usuário já existe com este email.';
  end if;

  -- Gera ID único para o novo usuário
  new_id := gen_random_uuid();
  
  -- Gera hash da senha (Bcrypt)
  encrypted_pw := crypt(password, gen_salt('bf'));

  -- 1. Inserir em auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    is_super_admin
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    email,
    encrypted_pw,
    now(), -- Confirmado
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nome', nome, 'perfil', perfil),
    now(),
    now(),
    '',
    '',
    false
  );

  -- 2. Inserir em auth.identities (CRUCIAL PARA O LOGIN FUNCIONAR)
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(), -- ID único da identidade
    new_id,            -- ID do usuário criado acima
    jsonb_build_object('sub', new_id, 'email', email),
    'email',
    new_id::text,      -- Para provider 'email', o provider_id é o user_id
    now(),
    now(),
    now()
  );

  -- 3. Inserir em public.profiles (Para sua aplicação)
  insert into public.profiles (id, email, nome, perfil)
  values (new_id, email, nome, perfil)
  on conflict (id) do update
  set nome = excluded.nome, perfil = excluded.perfil;

  return new_id;
end;
$$;

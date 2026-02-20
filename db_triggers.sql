-- 1. Limpeza: Remove a função manual antiga (já que vamos usar a API oficial)
drop function if exists public.create_new_user;

-- 2. Função de Trigger: Será executada automaticamente pelo Supabase
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, perfil)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'perfil'
  );
  return new;
end;
$$;

-- 3. Trigger: Ativa a função acima após cada INSERT em auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

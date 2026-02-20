-- 1. Criação da Tabela de Empresas
create table public.empresas (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  
  tipo text not null check (tipo in ('principal', 'filial')),
  parent_company_id uuid references public.empresas(id) on delete cascade,
  
  nome text not null,
  cnpj text not null,
  status_empresa text default 'Ativa',
  
  data_inicio date,
  data_termino date,
  
  esocial boolean default false,
  medico_coordenador text,
  observacoes text,
  
  -- Armazenaremos os links dos documentos e metadados aqui como JSON
  -- Ex: { "pcmso": { "url": "...", "nome": "...", "ano": ... } }
  documentos jsonb default '{}'::jsonb
);

-- 2. Habilitar Row Level Security (Segurança)
alter table public.empresas enable row level security;

-- Política: Permitir leitura para todos (ou apenas autenticados, ajustável)
create policy "Leitura pública de empresas"
on public.empresas for select
using ( true );

-- Política: Permitir inserção/atualização/deleção apenas para autenticados
create policy "Modificação apenas autenticados"
on public.empresas for all
using ( auth.role() = 'authenticated' );

-- 3. Configuração do Storage (Armazenamento de Arquivos)
-- Nota: Você precisa criar um bucket chamado 'documentos' no painel do Supabase,
-- mas vamos tentar configurar as políticas aqui caso o bucket já exista.

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', true)
on conflict (id) do nothing;

-- Política de Storage: Permitir leitura pública dos documentos
create policy "Leitura pública de documentos"
on storage.objects for select
using ( bucket_id = 'documentos' );

-- Política de Storage: Permitir upload apenas para autenticados
create policy "Upload autenticado documentos"
on storage.objects for insert
with check ( bucket_id = 'documentos' and auth.role() = 'authenticated' );

-- Política de Storage: Permitir deletar/atualizar apenas autenticados
create policy "Modificar documentos autenticado"
on storage.objects for all
using ( bucket_id = 'documentos' and auth.role() = 'authenticated' );

/*
  Sistema de Controle de Documentos Ocupacionais
  Arquivo: assets/js/storage.js
  
  MIGRAÇÃO SUPABASE:
  - Substitui LocalStorage por chamadas ao Supabase Database.
  - Funções assíncronas (async/await) agora são obrigatórias.
  
  Tabela: 'empresas'
*/

/**
 * Busca todas as empresas cadastradas no Supabase.
 * Retorna um array de objetos.
 */
async function getCompanies() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error("Erro ao buscar empresas:", error);
    return [];
  }
  
  // Normaliza o campo 'id' se necessário (Supabase usa UUID, que é string também)
  return (data || []).map(mapSnakeToCamel);
}

/**
 * Adiciona uma nova empresa/filial ao Supabase.
 */
async function addCompany(companyData) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('empresas')
    .insert([{
      tipo: companyData.tipo || "principal",
      parent_company_id: companyData.parentCompanyId || null,
      nome: companyData.nome,
      cnpj: companyData.cnpj,
      status_empresa: companyData.statusEmpresa,
      data_inicio: companyData.dataInicio,
      data_termino: companyData.dataTermino,
      esocial: !!companyData.esocial,
      medico_coordenador: companyData.medicoCoordenador,
      observacoes: companyData.observacoes || "",
      documentos: companyData.documentos || {}
    }])
    .select()
    .single();

  if (error) {
    console.error("Erro ao adicionar empresa:", error);
    return null;
  }

  // Mapeia de volta para o formato esperado pelo frontend (camelCase)
  return mapSnakeToCamel(data);
}

/**
 * Atualiza uma empresa/filial existente.
 */
async function updateCompany(id, partialData) {
  if (!supabase) return null;

  // Prepara objeto para update (converte camelCase para snake_case se necessário)
  const updatePayload = {};
  if (partialData.nome) updatePayload.nome = partialData.nome;
  if (partialData.cnpj) updatePayload.cnpj = partialData.cnpj;
  if (partialData.statusEmpresa) updatePayload.status_empresa = partialData.statusEmpresa;
  if (partialData.dataInicio) updatePayload.data_inicio = partialData.dataInicio;
  if (partialData.dataTermino) updatePayload.data_termino = partialData.dataTermino;
  if (partialData.esocial !== undefined) updatePayload.esocial = partialData.esocial;
  if (partialData.medicoCoordenador) updatePayload.medico_coordenador = partialData.medicoCoordenador;
  if (partialData.observacoes) updatePayload.observacoes = partialData.observacoes;
  if (partialData.documentos) updatePayload.documentos = partialData.documentos;
  
  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('empresas')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar empresa:", error);
    return null;
  }

  return mapSnakeToCamel(data);
}

/**
 * Busca uma empresa específica pelo ID.
 */
async function getCompanyById(id) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Erro ao buscar empresa por ID:", error);
    return null;
  }

  return mapSnakeToCamel(data);
}

/**
 * Remove uma empresa e, se for matriz, suas filiais.
 * No Supabase, se configurarmos 'ON DELETE CASCADE' na FK,
 * remover a matriz já remove as filiais automaticamente.
 */
async function deleteCompanyAndRelated(id) {
  if (!supabase) return false;

  const { error } = await supabase
    .from('empresas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Erro ao deletar empresa:", error);
    return false;
  }

  return true;
}

/**
 * Retorna a árvore de empresas (Matriz -> Filiais).
 * Faz uma única query e processa no cliente.
 */
async function getCompanyTree() {
  // getCompanies agora já retorna os dados normalizados (camelCase)
  const normalized = await getCompanies();

  const principals = normalized.filter((c) => c.tipo === "principal");
  const filiais = normalized.filter((c) => c.tipo === "filial");

  return principals.map((principal) => ({
    principal,
    filiais: filiais.filter((f) => f.parentCompanyId === principal.id),
  }));
}

// Utilitário para converter snake_case do banco para camelCase do JS
function mapSnakeToCamel(data) {
  if (!data) return null;
  return {
    id: data.id,
    tipo: data.tipo,
    parentCompanyId: data.parent_company_id,
    nome: data.nome,
    cnpj: data.cnpj,
    statusEmpresa: data.status_empresa,
    dataInicio: data.data_inicio,
    dataTermino: data.data_termino,
    esocial: data.esocial,
    medicoCoordenador: data.medico_coordenador,
    observacoes: data.observacoes,
    documentos: data.documentos, // JSONB já vem como objeto
    criadoEm: data.created_at,
    atualizadoEm: data.updated_at
  };
}

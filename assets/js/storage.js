/*
  Sistema de Controle de Documentos Ocupacionais
  Arquivo: assets/js/storage.js

  Objetivo:
  - Centralizar TODAS as operações de leitura e escrita no LocalStorage
    para empresas, filiais e documentos.
  - Facilitar a manutenção e evitar duplicação de código.

  Estrutura de dados (empresa / filial):
  {
    id: string,
    tipo: "principal" | "filial",
    parentCompanyId: string | null,   // null quando for empresa principal
    nome: string,
    cnpj: string,
    statusEmpresa: "Ativa" | "Inativa",
    dataInicio: "YYYY-MM-DD",
    dataTermino: "YYYY-MM-DD",
    esocial: boolean,
    medicoCoordenador: string,
    observacoes: string,
    documentos: {
      pcmso: { nomeArquivo, dataUploadISO, ano, dataUrl },
      ltcat: { nomeArquivo, dataUploadISO, ano, dataUrl },
      pgr:   { nomeArquivo, dataUploadISO, ano, dataUrl }
    },
    criadoEm: "YYYY-MM-DD", // data de cadastro
    atualizadoEm: "YYYY-MM-DD" | null
  }
*/

const COMPANY_STORAGE_KEY = "scdo_companies";

/**
 * Gera um ID simples baseado em timestamp + número aleatório.
 * - Não é um UUID real, mas é suficiente para este exemplo.
 */
function generateId(prefix) {
  const random = Math.floor(Math.random() * 1_000_000);
  return `${prefix || "id"}_${Date.now()}_${random}`;
}

/**
 * Lê e parseia o array de empresas do LocalStorage.
 * - Retorna sempre um array (vazio em caso de erro).
 */
function getCompanies() {
  const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Erro ao ler empresas do LocalStorage:", e);
    return [];
  }
}

/**
 * Sobrescreve o array de empresas no LocalStorage.
 */
function saveCompanies(companies) {
  try {
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(companies));
  } catch (e) {
    console.error("Erro ao salvar empresas no LocalStorage:", e);
  }
}

/**
 * Adiciona uma nova empresa/filial ao LocalStorage.
 * - Retorna o objeto salvo (já com ID gerado).
 */
function addCompany(companyData) {
  const companies = getCompanies();
  const now = new Date();
  const hojeISO = now.toISOString().slice(0, 10);

  const newCompany = {
    id: generateId("comp"),
    tipo: companyData.tipo || "principal",
    parentCompanyId: companyData.parentCompanyId || null,
    nome: companyData.nome,
    cnpj: companyData.cnpj,
    statusEmpresa: companyData.statusEmpresa,
    dataInicio: companyData.dataInicio,
    dataTermino: companyData.dataTermino,
    esocial: !!companyData.esocial,
    medicoCoordenador: companyData.medicoCoordenador,
    observacoes: companyData.observacoes || "",
    documentos: companyData.documentos,
    criadoEm: companyData.criadoEm || hojeISO,
    atualizadoEm: null,
  };

  companies.push(newCompany);
  saveCompanies(companies);

  return newCompany;
}

/**
 * Atualiza uma empresa/filial existente no LocalStorage.
 * - Recebe o ID e um objeto com os campos a serem atualizados.
 * - Retorna o objeto atualizado ou null se não encontrou.
 */
function updateCompany(id, partialData) {
  const companies = getCompanies();
  const index = companies.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const now = new Date();
  const hojeISO = now.toISOString().slice(0, 10);

  const updated = {
    ...companies[index],
    ...partialData,
    atualizadoEm: hojeISO,
  };

  companies[index] = updated;
  saveCompanies(companies);
  return updated;
}

/**
 * Busca uma empresa/filial específica pelo ID.
 */
function getCompanyById(id) {
  return getCompanies().find((c) => c.id === id) || null;
}

/**
 * Retorna apenas as empresas principais (tipo === "principal").
 */
function getMainCompanies() {
  return getCompanies().filter((c) => c.tipo === "principal");
}

/**
 * Retorna apenas as filiais vinculadas a uma empresa principal específica.
 */
function getBranchesOfCompany(parentCompanyId) {
  return getCompanies().filter(
    (c) => c.tipo === "filial" && c.parentCompanyId === parentCompanyId
  );
}

/**
 * Retorna um objeto com empresas principais e suas filiais agrupadas:
 * {
 *   principal: { ... },
 *   filiais: [ ... ]
 * }
 */
function getCompanyTree() {
  const companies = getCompanies();

  const principals = companies.filter((c) => c.tipo === "principal");
  const filiais = companies.filter((c) => c.tipo === "filial");

  return principals.map((principal) => ({
    principal,
    filiais: filiais.filter((f) => f.parentCompanyId === principal.id),
  }));
}

/**
 * Filtra empresas por intervalo de data de cadastro (criadoEm).
 * - dataInicio e dataFim devem vir no formato "YYYY-MM-DD".
 */
function filterCompaniesByCreatedAt(dataInicio, dataFim) {
  const companies = getCompanies();
  if (!dataInicio && !dataFim) {
    return companies;
  }

  const inicioTime = dataInicio ? new Date(dataInicio).getTime() : null;
  const fimTime = dataFim ? new Date(dataFim).getTime() : null;

  return companies.filter((c) => {
    if (!c.criadoEm) return false;
    const criadoTime = new Date(c.criadoEm).getTime();

    if (inicioTime && criadoTime < inicioTime) return false;
    if (fimTime && criadoTime > fimTime) return false;
    return true;
  });
}

/**
 * Remove uma empresa do LocalStorage.
 * - Se for uma empresa principal (matriz), também remove todas as filiais vinculadas.
 * - Se for uma filial, remove apenas aquela filial.
 * - Retorna true se alguma remoção foi realizada, ou false caso contrário.
 */
function deleteCompanyAndRelated(id) {
  const companies = getCompanies();
  const target = companies.find((c) => c.id === id);
  if (!target) return false;

  let filtered;

  if (target.tipo === "principal") {
    // Remove a matriz e todas as filiais que apontam para ela.
    filtered = companies.filter(
      (c) => c.id !== id && c.parentCompanyId !== id
    );
  } else {
    // Filial: remove apenas o registro específico.
    filtered = companies.filter((c) => c.id !== id);
  }

  if (filtered.length === companies.length) {
    return false;
  }

  saveCompanies(filtered);
  return true;
}



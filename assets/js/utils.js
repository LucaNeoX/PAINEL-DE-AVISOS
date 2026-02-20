/*
  Sistema de Controle de Documentos Ocupacionais
  Arquivo: assets/js/utils.js

  Objetivo:
  - Funções utilitárias genéricas usadas em várias telas:
    * Manipulação de datas
    * Cálculo de diferença de dias
    * Determinação de status (em dia, vencendo, vencido)
*/

/**
 * Converte uma string de data "YYYY-MM-DD" em objeto Date.
 * - Retorna null se a data for inválida.
 */
function parseISODate(dateStr) {
  if (!dateStr) return null;
  // Se a data vier como ISO completo (ex: 2026-02-19T00:00:00.000Z), pega só a parte da data
  if (dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
  }
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  // Mês em JS é 0-11
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Formata uma data "YYYY-MM-DD" para "dd/mm/yyyy".
 */
function formatDateToBR(dateStr) {
  const date = parseISODate(dateStr);
  if (!date) return "-";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0"); // Mês é 0-based
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Retorna a diferença em dias entre duas datas (dataFim - dataInicio).
 * - Considera apenas a parte de data (zera horas).
 */
function diffInDays(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return null;
  
  // Zera horas para comparar apenas datas
  const start = new Date(dataInicio);
  start.setHours(0,0,0,0);
  
  const end = new Date(dataFim);
  end.setHours(0,0,0,0);
  
  const diffMs = end.getTime() - start.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calcula o status de um documento com base na data de término.
 *
 * Regras:
 *  - Vermelho (vencido)        => dataTermino - hoje  < 0
 *  - Amarelo (vence em 90 dias)=> 0 <= dataTermino - hoje <= 90
 *  - Verde  (em dia)           => dataTermino - hoje  > 90 dias
 */
function calcularStatusPorDataTermino(dataTerminoStr) {
  const hoje = new Date();
  const dataTermino = parseISODate(dataTerminoStr);

  if (!dataTermino) {
    return {
      status: "indefinido",
      label: "Sem data",
      cssClass: "badge-secondary", // Cinza para indefinido
      diasRestantes: null,
    };
  }

  const diasRestantes = diffInDays(hoje, dataTermino);

  if (diasRestantes < 0) {
    return {
      status: "vencido",
      label: "Vencido",
      cssClass: "badge-danger",
      diasRestantes,
    };
  }

  if (diasRestantes <= 90) {
    return {
      status: "aviso",
      label: "Vence em breve",
      cssClass: "badge-warning",
      diasRestantes,
    };
  }

  return {
    status: "em_dia",
    label: "Em dia",
    cssClass: "badge-success",
    diasRestantes,
  };
}

/**
 * Calcula o status GERAL da empresa baseado nos seus documentos.
 * Retorna o "pior" status encontrado entre PCMSO, LTCAT e PGR.
 */
function calcularStatusGeralEmpresa(empresa) {
    const docs = empresa.documentos || {};
    const tipos = ["pcmso", "ltcat", "pgr"];
    
    let piorStatus = {
        status: "em_dia",
        label: "Em dia",
        cssClass: "badge-success",
        diasRestantes: 9999
    };
    
    let temDocumento = false;

    for (const tipo of tipos) {
        const doc = docs[tipo];
        // Se não tem documento, ignoramos ou consideramos pendente?
        // Vamos considerar apenas documentos existentes para o status de validade.
        if (doc && (doc.dataTermino || empresa.dataTermino)) {
            temDocumento = true;
            const dataFim = doc.dataTermino || empresa.dataTermino; // Fallback
            const statusDoc = calcularStatusPorDataTermino(dataFim);
            
            // Prioridade: Vencido > Aviso > Em dia
            if (statusDoc.status === "vencido") {
                return statusDoc; // Se achou um vencido, o status geral é vencido.
            }
            if (statusDoc.status === "aviso" && piorStatus.status !== "vencido") {
                piorStatus = statusDoc;
            }
            // Se for "indefinido" (sem data), tratamos como aviso?
            if (statusDoc.status === "indefinido" && piorStatus.status === "em_dia") {
                piorStatus = statusDoc;
            }
        }
    }
    
    if (!temDocumento) {
        return {
            status: "pendente",
            label: "Sem documentos",
            cssClass: "badge-secondary",
            diasRestantes: null
        };
    }

    return piorStatus;
}

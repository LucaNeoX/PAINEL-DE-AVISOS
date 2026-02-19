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
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, m - 1, d);
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
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Retorna a diferença em dias entre duas datas (dataFim - dataInicio).
 * - Considera apenas a parte de data (zera horas).
 */
function diffInDays(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return null;
  const start = new Date(
    dataInicio.getFullYear(),
    dataInicio.getMonth(),
    dataInicio.getDate()
  );
  const end = new Date(
    dataFim.getFullYear(),
    dataFim.getMonth(),
    dataFim.getDate()
  );
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calcula o status de um documento/empresa com base na data de término.
 *
 * Regras:
 *  - Verde  (em dia)           => dataTermino - hoje  > 90 dias
 *  - Amarelo (vence em 90 dias)=> 0 <= dataTermino - hoje <= 90
 *  - Vermelho (vencido)        => dataTermino - hoje  < 0
 *
 * Retorno:
 *  {
 *    status: "em_dia" | "aviso" | "vencido",
 *    label: "Em dia" | "Vence em até 90 dias" | "Vencido",
 *    cssClass: "badge-success" | "badge-warning" | "badge-danger",
 *    diasRestantes: number
 *  }
 */
function calcularStatusPorDataTermino(dataTerminoStr) {
  const hoje = new Date();
  const dataTermino = parseISODate(dataTerminoStr);
  if (!dataTermino) {
    return {
      status: "indefinido",
      label: "Data inválida",
      cssClass: "badge-warning",
      diasRestantes: null,
    };
  }

  const diasRestantes = diffInDays(hoje, dataTermino);

  if (diasRestantes === null) {
    return {
      status: "indefinido",
      label: "Data inválida",
      cssClass: "badge-warning",
      diasRestantes: null,
    };
  }

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
      label: "Vence em até 90 dias",
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


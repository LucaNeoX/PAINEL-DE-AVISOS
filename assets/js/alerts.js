/*
  Sistema de Controle de Documentos Ocupacionais
  Arquivo: assets/js/alerts.js

  Objetivo:
  - Calcular alertas automáticos de vencimento com base na data de término
    dos documentos (PCMSO, LTCAT, PGR).
  - Controlar a frequência de exibição dos alertas:
      * Avisar 90 dias antes do vencimento
      * Após o primeiro aviso, exibir novamente ~2x por semana

  Estratégia:
  - Cada documento terá uma chave única "docKey", por exemplo:
      `${companyId}_pcmso`, `${companyId}_ltcat`, `${companyId}_pgr`
  - No LocalStorage, salvamos a data do último alerta exibido para cada doc:
      scdo_alerts = {
        "comp_123_pcmso": "2026-02-01",
        "comp_123_ltdat": "2026-02-02",
        ...
      }
  - Quando o dashboard carregar, vamos:
      1) Calcular o status de cada documento (em dia, aviso, vencido)
      2) Verificar se devemos exibir alerta (aviso/vencido + intervalo de dias)
*/

const ALERTS_STORAGE_KEY = "scdo_alerts";

/**
 * Lê o mapa de últimas datas de alerta do LocalStorage.
 */
function getAlertsMap() {
  const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.error("Erro ao ler alertas do LocalStorage:", e);
    return {};
  }
}

/**
 * Salva o mapa de datas de alerta no LocalStorage.
 */
function saveAlertsMap(map) {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Erro ao salvar alertas no LocalStorage:", e);
  }
}

/**
 * Registra que exibimos um alerta hoje para um determinado documento.
 */
function registerAlertForDoc(docKey) {
  const map = getAlertsMap();
  const hojeISO = new Date().toISOString().slice(0, 10);
  map[docKey] = hojeISO;
  saveAlertsMap(map);
}

/**
 * Verifica se já passou tempo suficiente desde o último alerta para um doc.
 *
 * Regra:
 *  - Primeiro alerta: assim que entrar na janela de 0 a 90 dias (ou vencido)
 *  - Próximos alertas: no máximo ~2x por semana (intervalo de 3 dias)
 */
function shouldShowAlert(docKey) {
  const map = getAlertsMap();
  const lastDateStr = map[docKey];
  if (!lastDateStr) {
    // Nunca exibimos alerta para este documento: pode exibir
    return true;
  }

  const lastDate = parseISODate(lastDateStr);
  if (!lastDate) return true;

  const hoje = new Date();
  const diasDesdeUltimo = diffInDays(lastDate, hoje);

  // Se já se passaram pelo menos 3 dias, podemos exibir novamente (~2x/semana)
  return diasDesdeUltimo >= 3;
}

/**
 * Percorre todas as empresas e documentos e calcula:
 * - Lista de alertas a serem exibidos (para o dashboard)
 * - Número de documentos vencendo (0-90 dias)
 * - Número de documentos já vencidos
 *
 * Retorno:
 * {
 *   alerts: [
 *     {
 *       docKey,
 *       empresaNome,
 *       tipoDocumento,
 *       status,          // "aviso" ou "vencido"
 *       labelStatus,     // texto amigável
 *       diasRestantes
 *     },
 *     ...
 *   ],
 *   contadores: {
 *     vencendo: number,
 *     vencidos: number
 *   }
 * }
 */
function calcularAlertasDocumentos() {
  const companies = getCompanies();
  const alerts = [];

  let totalVencendo = 0;
  let totalVencidos = 0;

  companies.forEach((company) => {
    if (!company.documentos) return;

    const tiposDocs = ["pcmso", "ltcat", "pgr"];

    tiposDocs.forEach((tipo) => {
      const doc = company.documentos[tipo];
      if (!doc || !company.dataTermino) return;

      const statusInfo = calcularStatusPorDataTermino(company.dataTermino);

      if (statusInfo.status === "aviso") {
        totalVencendo += 1;
      } else if (statusInfo.status === "vencido") {
        totalVencidos += 1;
      } else {
        return; // Em dia, não gera alerta
      }

      const docKey = `${company.id}_${tipo}`;

      if (!shouldShowAlert(docKey)) {
        return;
      }

      alerts.push({
        docKey,
        empresaNome: company.nome,
        tipoDocumento: tipo.toUpperCase(),
        status: statusInfo.status,
        labelStatus: statusInfo.label,
        diasRestantes: statusInfo.diasRestantes,
      });
    });
  });

  return {
    alerts,
    contadores: {
      vencendo: totalVencendo,
      vencidos: totalVencidos,
    },
  };
}


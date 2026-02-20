/*
  Sistema de Controle de Documentos Ocupacionais
  Arquivo: assets/js/alerts.js

  MIGRAÇÃO DATAS INDIVIDUAIS:
  - Verifica dataTermino de CADA documento (docs[tipo].dataTermino).
  - Fallback para empresa.dataTermino se não existir.
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
 */
function shouldShowAlert(docKey) {
  const map = getAlertsMap();
  const lastDateStr = map[docKey];
  if (!lastDateStr) return true;

  const lastDate = parseISODate(lastDateStr);
  if (!lastDate) return true;

  const hoje = new Date();
  const diasDesdeUltimo = diffInDays(lastDate, hoje);

  return diasDesdeUltimo >= 3;
}

/**
 * Calcula alertas baseados nas datas individuais dos documentos.
 */
function calcularAlertasDocumentos(companies = []) {
  const alerts = [];
  const hoje = new Date();

  let totalVencendo = 0;
  let totalVencidos = 0;

  companies.forEach((company) => {
    // Se a empresa está inativa, talvez não devêssemos gerar alerta?
    // Vamos manter alertas mesmo para inativas, ou filtrar? Normalmente inativa não precisa.
    if (company.statusEmpresa === "Inativa") return;

    const tiposDocs = ["pcmso", "ltcat", "pgr"];
    const docs = company.documentos || {};

    tiposDocs.forEach((tipo) => {
      const doc = docs[tipo];
      // Se o documento não existe, não há o que vencer (ou seria pendência de upload?)
      // O sistema foca em VIGÊNCIA.
      if (!doc) return;

      // Pega data específica do doc, ou fallback para empresa (migração)
      const dataFim = doc.dataTermino || company.dataTermino;
      
      if (!dataFim) return; // Sem data, sem cálculo

      const statusInfo = calcularStatusPorDataTermino(dataFim);

      if (statusInfo.status === "aviso") {
        totalVencendo++;
      } else if (statusInfo.status === "vencido") {
        totalVencidos++;
      } else {
        return; // Em dia
      }

      const docKey = `${company.id}_${tipo}`;
      
      if (shouldShowAlert(docKey)) {
        alerts.push({
          docKey,
          empresaNome: company.nome,
          tipoDocumento: tipo.toUpperCase(),
          status: statusInfo.status,
          labelStatus: statusInfo.label,
          diasRestantes: statusInfo.diasRestantes,
        });
      }
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

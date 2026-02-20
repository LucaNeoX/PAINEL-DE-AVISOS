/*
  Dashboard
  Arquivo: /dashboard/dashboard.js

  MIGRAÇÃO SUPABASE:
  - Carregamento assíncrono de empresas
  - Uso de calcularAlertasDocumentos com lista passada por parâmetro
*/

document.addEventListener("DOMContentLoaded", function () {
  const session = requireAuth();
  if (!session) return;

  fillSidebarUserInfo();
  registerLogoutButton();

  carregarDadosDashboard();
});

async function carregarDadosDashboard() {
  const spanEmpresas = document.getElementById("count-empresas");
  const spanVencendo = document.getElementById("count-vencendo");
  const spanVencidos = document.getElementById("count-vencidos");
  const alertasContainer = document.getElementById("lista-alertas");

  // Feedback de carregamento
  spanEmpresas.textContent = "...";
  spanVencendo.textContent = "...";
  spanVencidos.textContent = "...";
  alertasContainer.innerHTML = "<p class='text-muted'>Verificando alertas...</p>";

  try {
    const empresas = await getCompanies();

    // 1. Atualiza contador de empresas
    spanEmpresas.textContent = String(empresas.length);

    // 2. Calcula alertas e contadores de documentos
    // Agora passamos a lista de empresas explicitamente
    const { alerts, contadores } = calcularAlertasDocumentos(empresas);

    spanVencendo.textContent = String(contadores.vencendo);
    spanVencidos.textContent = String(contadores.vencidos);

    // 3. Monta a lista visual de alertas
    montarListaAlertas(alerts);

  } catch (err) {
    console.error("Erro ao carregar dashboard:", err);
    spanEmpresas.textContent = "Erro";
    alertasContainer.innerHTML = "<p class='error'>Erro ao carregar dados.</p>";
  }
}

/**
 * Renderiza a lista de alertas calculados.
 */
function montarListaAlertas(alerts) {
  const container = document.getElementById("lista-alertas");
  container.innerHTML = "";

  if (!alerts || !alerts.length) {
    const empty = document.createElement("div");
    empty.className = "alert-empty";
    empty.textContent = "Nenhum alerta pendente no momento.";
    container.appendChild(empty);
    return;
  }

  alerts.forEach((alert) => {
    const item = document.createElement("div");
    item.className = "alert-item";

    const main = document.createElement("div");
    main.className = "alert-main";

    const title = document.createElement("div");
    title.className = "alert-title";
    title.textContent = `${alert.empresaNome} - ${alert.tipoDocumento}`;

    const subtitle = document.createElement("div");
    subtitle.className = "alert-subtitle";
    subtitle.textContent =
      alert.status === "vencido"
        ? "Documento vencido. Atualização imediata recomendada."
        : "Documento se aproxima da data de vencimento.";

    main.appendChild(title);
    main.appendChild(subtitle);

    const badgeArea = document.createElement("div");
    badgeArea.className = "alert-badge-area";

    const badge = document.createElement("div");
    badge.className = `badge ${alert.status === "vencido" ? "badge-danger" : "badge-warning"}`;

    const dot = document.createElement("span");
    dot.className = "badge-dot";

    const label = document.createElement("span");
    label.textContent = alert.labelStatus;

    badge.appendChild(dot);
    badge.appendChild(label);

    const days = document.createElement("div");
    days.className = "alert-days";

    if (alert.diasRestantes < 0) {
      days.textContent = `${Math.abs(alert.diasRestantes)} dia(s) em atraso`;
    } else if (alert.diasRestantes === 0) {
      days.textContent = "Vence hoje";
    } else {
      days.textContent = `Vence em ${alert.diasRestantes} dia(s)`;
    }

    badgeArea.appendChild(badge);
    badgeArea.appendChild(days);

    item.appendChild(main);
    item.appendChild(badgeArea);

    container.appendChild(item);

    // Registra exibição para controle de frequência
    registerAlertForDoc(alert.docKey);
  });
}

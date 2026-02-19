/*
  Dashboard
  Arquivo: /dashboard/dashboard.js

  Responsável por:
  - Garantir que o usuário esteja autenticado
  - Preencher o cabeçalho com os dados do usuário
  - Calcular:
      * Quantidade de empresas (matriz + filial)
      * Quantidade de documentos vencendo
      * Quantidade de documentos vencidos
  - Montar a lista de alertas automáticos no card principal
*/

document.addEventListener("DOMContentLoaded", function () {
  // Garante que existe sessão. Se não existir, faz redirect para o login.
  const session = requireAuth();
  if (!session) return;

  // Preenche informações do usuário na sidebar e botão de logout.
  fillSidebarUserInfo();
  registerLogoutButton();

  // Preenche os contadores principais do topo.
  preencherContadoresDashboard();

  // Monta a lista de alertas de vencimento.
  montarListaAlertas();
});

/**
 * Lê as empresas e preenche os contadores:
 * - Total de empresas (matriz + filial)
 * - Total de documentos vencendo
 * - Total de documentos vencidos
 */
function preencherContadoresDashboard() {
  const empresas = getCompanies();
  const spanEmpresas = document.getElementById("count-empresas");
  const spanVencendo = document.getElementById("count-vencendo");
  const spanVencidos = document.getElementById("count-vencidos");

  spanEmpresas.textContent = String(empresas.length);

  const { contadores } = calcularAlertasDocumentos();

  spanVencendo.textContent = String(contadores.vencendo);
  spanVencidos.textContent = String(contadores.vencidos);
}

/**
 * Monta os alertas de vencimento dentro do card "Alertas de vencimento".
 * - A função calcularAlertasDocumentos() retorna apenas o que realmente
 *   deve ser exibido hoje (considerando a frequência ~2x por semana).
 * - Cada alerta mostra:
 *    * Nome da empresa
 *    * Tipo do documento (PCMSO / LTCAT / PGR)
 *    * Badge com status (em aviso ou vencido)
 *    * Informação de dias restantes
 */
function montarListaAlertas() {
  const container = document.getElementById("lista-alertas");
  container.innerHTML = "";

  const { alerts } = calcularAlertasDocumentos();

  if (!alerts.length) {
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

    // Registra que este alerta foi exibido hoje,
    // para controlar a frequência de exibição (~2x por semana).
    registerAlertForDoc(alert.docKey);
  });
}


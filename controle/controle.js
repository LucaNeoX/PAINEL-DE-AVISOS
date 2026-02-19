/*
  Controle
  Arquivo: /controle/controle.js

  Responsável por:
  - Garantir autenticação e exibir dados do usuário na sidebar
  - Aplicar filtros por período (data inicial/final) usando o campo criadoEm
  - Calcular indicadores:
      * Empresas no período
      * Quantidade de PCMSO, LTCAT, PGR
      * Quantos documentos ativos
      * Quantos documentos vencidos
*/

document.addEventListener("DOMContentLoaded", function () {
  const session = requireAuth();
  if (!session) return;

  fillSidebarUserInfo();
  registerLogoutButton();

  inicializarControle();
});

function inicializarControle() {
  const btnFiltro = document.getElementById("btn-aplicar-filtro");
  const btnLimpar = document.getElementById("btn-limpar");

  btnFiltro.addEventListener("click", aplicarFiltro);
  btnLimpar.addEventListener("click", () => {
    document.getElementById("filtroDataInicio").value = "";
    document.getElementById("filtroDataFim").value = "";
    aplicarFiltro();
  });

  // Ao carregar a página, aplica o filtro "sem datas" (todos)
  aplicarFiltro();
}

/**
 * Lê os campos de data, filtra as empresas e atualiza os indicadores.
 */
function aplicarFiltro() {
  const dataInicio = document.getElementById("filtroDataInicio").value;
  const dataFim = document.getElementById("filtroDataFim").value;

  // Função definida em storage.js
  const empresas = filterCompaniesByCreatedAt(dataInicio, dataFim);

  const spanEmpresas = document.getElementById("c-empresas");
  const spanPcmso = document.getElementById("c-pcmso");
  const spanLtcat = document.getElementById("c-ltcat");
  const spanPgr = document.getElementById("c-pgr");
  const spanAtivos = document.getElementById("c-ativos");
  const spanVencidos = document.getElementById("c-vencidos");

  spanEmpresas.textContent = String(empresas.length);

  let totalPcmso = 0;
  let totalLtcat = 0;
  let totalPgr = 0;
  let ativos = 0;
  let vencidos = 0;

  empresas.forEach((empresa) => {
    const docs = empresa.documentos || {};

    if (docs.pcmso) totalPcmso += 1;
    if (docs.ltcat) totalLtcat += 1;
    if (docs.pgr) totalPgr += 1;

    const status = calcularStatusPorDataTermino(empresa.dataTermino);
    if (status.status === "vencido") {
      vencidos += 1;
    } else {
      ativos += 1;
    }
  });

  spanPcmso.textContent = String(totalPcmso);
  spanLtcat.textContent = String(totalLtcat);
  spanPgr.textContent = String(totalPgr);
  spanAtivos.textContent = String(ativos);
  spanVencidos.textContent = String(vencidos);
}


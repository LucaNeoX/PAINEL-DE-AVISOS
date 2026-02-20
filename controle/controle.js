/*
  Controle
  Arquivo: /controle/controle.js

  MIGRAÇÃO DATAS INDIVIDUAIS:
  - Contagem agora varre cada documento (PCMSO, LTCAT, PGR).
  - Verifica status individual de cada um.
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

  // Ao clicar em aplicar, executa a busca e filtro
  btnFiltro.addEventListener("click", () => aplicarFiltro());

  // Limpar campos e reaplicar filtro (busca tudo)
  btnLimpar.addEventListener("click", () => {
    document.getElementById("filtroDataInicio").value = "";
    document.getElementById("filtroDataFim").value = "";
    aplicarFiltro();
  });

  // Carrega dados iniciais
  aplicarFiltro();
}

/**
 * Busca todas as empresas e filtra localmente pelas datas selecionadas.
 */
async function aplicarFiltro() {
  const dataInicioInput = document.getElementById("filtroDataInicio").value;
  const dataFimInput = document.getElementById("filtroDataFim").value;
  
  // Elementos de contagem
  const spanEmpresas = document.getElementById("c-empresas");
  const spanPcmso = document.getElementById("c-pcmso");
  const spanLtcat = document.getElementById("c-ltcat");
  const spanPgr = document.getElementById("c-pgr");
  const spanAtivos = document.getElementById("c-ativos");
  const spanVencidos = document.getElementById("c-vencidos");

  // Feedback visual de carregamento
  spanEmpresas.textContent = "...";
  
  try {
    // Busca TODAS as empresas do banco
    const todasEmpresas = await getCompanies();

    // Filtra empresas pelo critério de data de cadastro (criadoEm)
    const empresasFiltradas = todasEmpresas.filter(empresa => {
      if (!empresa.criadoEm) return false; // Se não tem data de criação, ignora ou inclui? Vamos ignorar.
      
      const dataCriacaoSimples = empresa.criadoEm.split('T')[0]; // YYYY-MM-DD
      
      if (dataInicioInput && dataCriacaoSimples < dataInicioInput) return false;
      if (dataFimInput && dataCriacaoSimples > dataFimInput) return false;

      return true;
    });

    // Atualiza contador de empresas
    spanEmpresas.textContent = String(empresasFiltradas.length);

    // Variáveis para contagem de DOCUMENTOS
    let totalPcmso = 0;
    let totalLtcat = 0;
    let totalPgr = 0;
    
    let docsAtivos = 0;
    let docsVencidos = 0;

    const tiposDocs = ["pcmso", "ltcat", "pgr"];

    empresasFiltradas.forEach((empresa) => {
      const docs = empresa.documentos || {};

      tiposDocs.forEach(tipo => {
          const doc = docs[tipo];
          // Só conta se o documento existir (upload feito)
          if (doc && (doc.dataUrl || doc.nomeArquivo)) {
              
              // Incrementa totais por tipo
              if (tipo === "pcmso") totalPcmso++;
              if (tipo === "ltcat") totalLtcat++;
              if (tipo === "pgr") totalPgr++;

              // Verifica status (Vencido vs Ativo)
              // Usa data do documento, ou fallback para data da empresa
              const dataFim = doc.dataTermino || empresa.dataTermino;
              
              if (dataFim) {
                  const statusInfo = calcularStatusPorDataTermino(dataFim);
                  if (statusInfo.status === "vencido") {
                      docsVencidos++;
                  } else {
                      // Aviso ou Em dia contam como "Ativos" (válidos)
                      docsAtivos++;
                  }
              } else {
                  // Se não tem data, consideramos o quê?
                  // Vamos considerar ativo mas indefinido.
                  docsAtivos++;
              }
          }
      });
    });

    spanPcmso.textContent = String(totalPcmso);
    spanLtcat.textContent = String(totalLtcat);
    spanPgr.textContent = String(totalPgr);
    spanAtivos.textContent = String(docsAtivos);
    spanVencidos.textContent = String(docsVencidos);

  } catch (err) {
    console.error("Erro ao aplicar filtro:", err);
    spanEmpresas.textContent = "Erro";
  }
}

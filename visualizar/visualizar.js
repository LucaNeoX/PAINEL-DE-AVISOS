/*
  Visualizar Empresas
  Arquivo: /visualizar/visualizar.js

  Responsável por:
  - Garantir autenticação e exibir dados do usuário na sidebar
  - Listar empresas principais (matrizes) em blocos horizontais
  - Listar filiais vinculadas logo abaixo de cada matriz
  - Calcular status de vencimento (cores verde/amarelo/vermelho)
  - Regras de interação:
      * Clique único na MATRIZ:
          - Apenas expande/recolhe a lista de filiais vinculadas
      * Clique duplo na MATRIZ:
          - Mostra/oculta os detalhes completos da matriz
          - Exibe botões para visualizar PDFs e cadastrar nova filial
      * Clique único na FILIAL:
          - Mostra/oculta diretamente os detalhes completos da filial
          - Exibe botões para visualizar PDFs
  - Abrir modal simples com visualização de PDF em iframe
*/

document.addEventListener("DOMContentLoaded", function () {
  const session = requireAuth();
  if (!session) return;

  fillSidebarUserInfo();
  registerLogoutButton();

  montarListaEmpresas(session);
  configurarModalPdf();
});

/**
 * Monta a listagem de empresas principais, com suas filiais vinculadas.
 */
function montarListaEmpresas(session) {
  const container = document.getElementById("lista-empresas");
  container.innerHTML = "";

  const arvore = getCompanyTree();

  if (!arvore.length) {
    const empty = document.createElement("p");
    empty.className = "text-muted";
    empty.textContent =
      "Nenhuma empresa cadastrada ainda. Acesse 'Cadastrar empresa' para iniciar.";
    container.appendChild(empty);
    return;
  }

  arvore.forEach((grupo) => {
    const { principal, filiais } = grupo;

    // Wrapper agrupa a matriz e o bloco de filiais logo abaixo.
    const grupoWrapper = document.createElement("div");
    grupoWrapper.className = "empresa-grupo";

    // Container que receberá os cards das filiais (inicia recolhido).
    const filiaisWrapper = document.createElement("div");
    filiaisWrapper.className = "empresa-filiais-list";

    // Card da empresa principal (matriz)
    const cardMatriz = criarCardEmpresa(principal, filiais, filiaisWrapper, session);

    // Cards de filiais (um card por filial, levemente recuados)
    if (filiais && filiais.length) {
      filiais.forEach((filial) => {
        const cardFilial = criarCardFilial(filial, session);
        filiaisWrapper.appendChild(cardFilial);
      });
    }

    grupoWrapper.appendChild(cardMatriz);
    grupoWrapper.appendChild(filiaisWrapper);
    container.appendChild(grupoWrapper);
  });
}

/**
 * Cria o bloco visual de uma empresa principal (matriz).
 * - card com:
 *   * Nome
 *   * Status com cor
 *   * Sub-informações
 *   * Detalhes expansíveis (dados + botões para PDFs)
 *   * Botão para cadastrar filial
 *
 * Regras de clique:
 *   - Clique simples:
 *       Mostra/oculta a lista de filiais logo abaixo (filiaisWrapper)
 *   - Duplo clique:
 *       Mostra/oculta os detalhes da própria matriz (dados + PDFs)
 */
function criarCardEmpresa(empresa, filiais, filiaisWrapper, session) {
  const card = document.createElement("article");
  card.className = "empresa-card fade-in";

  const header = document.createElement("div");
  header.className = "empresa-header";

  const info = document.createElement("div");

  const nome = document.createElement("div");
  nome.className = "empresa-nome";
  nome.textContent = empresa.nome;

  const subinfo = document.createElement("div");
  subinfo.className = "empresa-subinfo";
  subinfo.textContent = `CNPJ: ${empresa.cnpj} · Início: ${formatDateToBR(empresa.dataInicio)} · Término: ${formatDateToBR(empresa.dataTermino)}`;

  info.appendChild(nome);
  info.appendChild(subinfo);

  const statusInfo = calcularStatusPorDataTermino(empresa.dataTermino);
  const badge = document.createElement("div");
  badge.className = `badge ${statusInfo.cssClass}`;

  const dot = document.createElement("span");
  dot.className = "badge-dot";

  const label = document.createElement("span");
  label.textContent = statusInfo.label;

  badge.appendChild(dot);
  badge.appendChild(label);

  header.appendChild(info);
  header.appendChild(badge);

  const actions = document.createElement("div");
  actions.className = "empresa-actions";

  const btnFilial = document.createElement("button");
  btnFilial.type = "button";
  btnFilial.className = "btn btn-secondary";
  btnFilial.textContent = "Cadastrar filial";

  btnFilial.addEventListener("click", function (e) {
    e.stopPropagation();
    const params = new URLSearchParams({
      tipo: "filial",
      parentId: empresa.id,
      parentName: empresa.nome,
    });
    window.location.href = "../cadastro/index.html?" + params.toString();
  });

  actions.appendChild(btnFilial);

  // Botão de exclusão da empresa (apenas para administradores)
  if (session.perfil === "admin") {
    const btnExcluir = document.createElement("button");
    btnExcluir.type = "button";
    btnExcluir.className = "btn btn-danger";
    btnExcluir.textContent = "Excluir empresa";

    btnExcluir.addEventListener("click", function (e) {
      e.stopPropagation();

      const temFiliais = Array.isArray(filiais) && filiais.length > 0;
      const mensagemConfirmacao = temFiliais
        ? "Tem certeza que deseja excluir esta empresa e todas as filiais vinculadas? Esta ação não poderá ser desfeita."
        : "Tem certeza que deseja excluir esta empresa? Esta ação não poderá ser desfeita.";

      const confirmado = window.confirm(mensagemConfirmacao);
      if (!confirmado) return;

      const sucesso = deleteCompanyAndRelated(empresa.id);
      if (!sucesso) {
        alert("Não foi possível excluir a empresa. Tente novamente.");
        return;
      }

      // Recarrega a listagem para refletir a remoção
      montarListaEmpresas(session);
    });

    actions.appendChild(btnExcluir);
  }

  const detalhes = document.createElement("div");
  detalhes.className = "empresa-detalhes";

  const linha1 = document.createElement("div");
  linha1.textContent = `Status: ${empresa.statusEmpresa} · Médico coordenador: ${empresa.medicoCoordenador}`;

  const linha2 = document.createElement("div");
  linha2.textContent = `E-Social: ${empresa.esocial ? "Sim" : "Não"}`;

  const linha3 = document.createElement("div");
  linha3.textContent = empresa.observacoes
    ? `Observações: ${empresa.observacoes}`
    : "Sem observações adicionais.";

  detalhes.appendChild(linha1);
  detalhes.appendChild(linha2);
  detalhes.appendChild(linha3);

  const docButtons = document.createElement("div");
  docButtons.className = "empresa-doc-buttons";

  const docs = empresa.documentos || {};
  ["pcmso", "ltcat", "pgr"].forEach((tipo) => {
    const doc = docs[tipo];
    if (!doc) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary";
    btn.textContent = `${tipo.toUpperCase()} (${doc.nomeArquivo || "PDF"})`;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      abrirModalPdf(
        empresa.nome,
        tipo.toUpperCase(),
        doc.dataUrl,
        doc.nomeArquivo
      );
    });

    docButtons.appendChild(btn);
  });

  detalhes.appendChild(docButtons);

  card.appendChild(header);
  card.appendChild(actions);
  card.appendChild(detalhes);

  /*
    Lógica de cliques na MATRIZ:

    - Usamos um pequeno timer para diferenciar entre clique simples e duplo clique.
      * 1 clique => apenas expande/recolhe as filiais vinculadas.
      * 2 cliques rápidos => expande/recolhe os detalhes da própria matriz.
  */
  let clickTimeout = null;

  card.addEventListener("click", function (e) {
    // Atalho: ALT + clique abre edição diretamente para administradores.
    if (e.altKey && session.perfil === "admin") {
      const params = new URLSearchParams({ id: empresa.id });
      window.location.href = "../cadastro/index.html?" + params.toString();
      return;
    }

    if (clickTimeout) {
      // Segundo clique dentro do intervalo: tratamos como duplo clique.
      clearTimeout(clickTimeout);
      clickTimeout = null;

      // Duplo clique na MATRIZ:
      // - Mostra/oculta detalhes completos da matriz (dados + PDFs)
      // - Exibe também o botão "Cadastrar filial"
      card.classList.toggle("expandida");
      card.classList.toggle("mostra-filial");
    } else {
      // Primeiro clique → aguardamos um curto intervalo para saber se virá o segundo.
      clickTimeout = setTimeout(function () {
        clickTimeout = null;

        // Clique simples na MATRIZ:
        // - Mostra/oculta a lista de filiais vinculadas (sem mexer nos detalhes da matriz).
        if (!filiais || !filiais.length || !filiaisWrapper) return;

        const aberta = filiaisWrapper.classList.contains("aberta");
        if (aberta) {
          filiaisWrapper.classList.remove("aberta");
        } else {
          filiaisWrapper.classList.add("aberta");
        }
      }, 220);
    }
  });

  return card;
}

/**
 * Cria o card visual de uma FILIAL.
 * - Visualmente é um card semelhante ao da matriz, mas levemente recuado
 *   (controlado por CSS) para indicar hierarquia.
 *
 * Regra de clique:
 *  - Clique simples na FILIAL:
 *      Mostra/oculta diretamente os detalhes completos da filial
 *      (dados + botões para PDFs).
 */
function criarCardFilial(empresa, session) {
  const card = document.createElement("article");
  card.className = "empresa-card empresa-card-filial fade-in";

  const header = document.createElement("div");
  header.className = "empresa-header";

  const info = document.createElement("div");

  const nome = document.createElement("div");
  nome.className = "empresa-nome";
  nome.textContent = empresa.nome;

  const subinfo = document.createElement("div");
  subinfo.className = "empresa-subinfo";
  subinfo.textContent = `Filial · CNPJ: ${empresa.cnpj} · Início: ${formatDateToBR(empresa.dataInicio)} · Término: ${formatDateToBR(empresa.dataTermino)}`;

  info.appendChild(nome);
  info.appendChild(subinfo);

  const statusInfo = calcularStatusPorDataTermino(empresa.dataTermino);
  const badge = document.createElement("div");
  badge.className = `badge ${statusInfo.cssClass}`;

  const dot = document.createElement("span");
  dot.className = "badge-dot";

  const label = document.createElement("span");
  label.textContent = statusInfo.label;

  badge.appendChild(dot);
  badge.appendChild(label);

  header.appendChild(info);
  header.appendChild(badge);

  const detalhes = document.createElement("div");
  detalhes.className = "empresa-detalhes";

  const linha1 = document.createElement("div");
  linha1.textContent = `Status: ${empresa.statusEmpresa} · Médico coordenador: ${empresa.medicoCoordenador}`;

  const linha2 = document.createElement("div");
  linha2.textContent = `E-Social: ${empresa.esocial ? "Sim" : "Não"}`;

  const linha3 = document.createElement("div");
  linha3.textContent = empresa.observacoes
    ? `Observações: ${empresa.observacoes}`
    : "Sem observações adicionais.";

  detalhes.appendChild(linha1);
  detalhes.appendChild(linha2);
  detalhes.appendChild(linha3);

  const docButtons = document.createElement("div");
  docButtons.className = "empresa-doc-buttons";

  const docs = empresa.documentos || {};
  ["pcmso", "ltcat", "pgr"].forEach((tipo) => {
    const doc = docs[tipo];
    if (!doc) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary";
    btn.textContent = `${tipo.toUpperCase()} (${doc.nomeArquivo || "PDF"})`;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      abrirModalPdf(
        empresa.nome,
        tipo.toUpperCase(),
        doc.dataUrl,
        doc.nomeArquivo
      );
    });

    docButtons.appendChild(btn);
  });

  detalhes.appendChild(docButtons);

  card.appendChild(header);
  card.appendChild(detalhes);

  // Área de ações da filial (apenas para administradores)
  if (session.perfil === "admin") {
    const actions = document.createElement("div");
    actions.className = "empresa-actions";

    const btnExcluir = document.createElement("button");
    btnExcluir.type = "button";
    btnExcluir.className = "btn btn-danger";
    btnExcluir.textContent = "Excluir filial";

    btnExcluir.addEventListener("click", function (e) {
      e.stopPropagation();

      const confirmado = window.confirm(
        "Tem certeza que deseja excluir esta filial? Esta ação não poderá ser desfeita."
      );
      if (!confirmado) return;

      const sucesso = deleteCompanyAndRelated(empresa.id);
      if (!sucesso) {
        alert("Não foi possível excluir a filial. Tente novamente.");
        return;
      }

      // Recarrega a listagem para refletir a remoção
      montarListaEmpresas(session);
    });

    actions.appendChild(btnExcluir);
    card.appendChild(actions);
  }

  // Clique simples na FILIAL: mostra/oculta detalhes completos.
  card.addEventListener("click", function (e) {
    // Atalho: ALT + clique abre edição diretamente para administradores.
    if (e.altKey && session.perfil === "admin") {
      const params = new URLSearchParams({ id: empresa.id });
      window.location.href = "../cadastro/index.html?" + params.toString();
      return;
    }

    card.classList.toggle("expandida");
  });

  return card;
}

/**
 * Configura o comportamento básico do modal de PDF.
 */
function configurarModalPdf() {
  const modal = document.getElementById("pdf-modal");
  const closers = modal.querySelectorAll("[data-modal-close]");

  closers.forEach((el) => {
    el.addEventListener("click", function () {
      fecharModalPdf();
    });
  });
}

/**
 * Abre o modal com o PDF em iframe.
 */
function abrirModalPdf(empresaNome, tipoDoc, dataUrl, nomeArquivo) {
  const modal = document.getElementById("pdf-modal");
  const title = document.getElementById("pdf-modal-title");
  const subtitle = document.getElementById("pdf-modal-subtitle");
  const viewer = document.getElementById("pdf-viewer");

  title.textContent = `${tipoDoc} - ${empresaNome}`;
  subtitle.textContent = nomeArquivo || "";
  viewer.src = dataUrl || "";

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

/**
 * Fecha o modal de visualização de PDF.
 */
function fecharModalPdf() {
  const modal = document.getElementById("pdf-modal");
  const viewer = document.getElementById("pdf-viewer");

  viewer.src = "about:blank";
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}


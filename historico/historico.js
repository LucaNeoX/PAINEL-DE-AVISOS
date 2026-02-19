/*
  Histórico (explorador de arquivos)
  Arquivo: /historico/historico.js

  Responsável por:
  - Garantir autenticação e informações do usuário na sidebar
  - Ler todas as empresas/filiais e construir uma árvore:
      Empresa
      ├── Principal
      │   ├── [Ano]
      │   │   ├── PCMSO.pdf
      │   │   ├── LTCAT.pdf
      │   │   └── PGR.pdf
      └── [Filial]
          ├── [Ano]
          │   ├── PCMSO.pdf
          │   ├── LTCAT.pdf
          │   └── PGR.pdf
  - Permitir expandir e recolher pastas clicando nos nós.
*/

document.addEventListener("DOMContentLoaded", function () {
  const session = requireAuth();
  if (!session) return;

  fillSidebarUserInfo();
  registerLogoutButton();

  montarArvoreHistorico();
});

/**
 * Monta a árvore de histórico dentro de #tree-container.
 */
function montarArvoreHistorico() {
  const container = document.getElementById("tree-container");
  container.innerHTML = "";

  const arvore = getCompanyTree();

  if (!arvore.length) {
    const empty = document.createElement("p");
    empty.className = "text-muted";
    empty.textContent =
      "Nenhuma empresa cadastrada ainda. O histórico será montado automaticamente a partir dos cadastros.";
    container.appendChild(empty);
    return;
  }

  const root = document.createElement("div");
  root.className = "tree-node";

  arvore.forEach((grupo) => {
    const empresaNode = criarNoEmpresa(grupo.principal, grupo.filiais);
    root.appendChild(empresaNode);
  });

  container.appendChild(root);
}

/**
 * Cria o nó da empresa principal, com:
 *  - Pasta "Principal"
 *  - Pastas de filiais
 */
function criarNoEmpresa(principal, filiais) {
  const empresaNode = document.createElement("div");
  empresaNode.className = "tree-node";

  const item = document.createElement("div");
  item.className = "tree-item tree-folder";

  const label = document.createElement("div");
  label.className = "tree-label";

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = "🏢";

  const text = document.createElement("span");
  text.textContent = principal.nome;

  label.appendChild(icon);
  label.appendChild(text);

  item.appendChild(label);

  empresaNode.appendChild(item);

  const children = document.createElement("div");
  children.className = "tree-children";

  // Nó "Principal"
  const principalNode = criarNoTipoEmpresa(principal, "Principal");
  children.appendChild(principalNode);

  // Nó(s) de filiais
  if (filiais && filiais.length) {
    filiais.forEach((filial) => {
      const filialNode = criarNoTipoEmpresa(filial, filial.nome);
      children.appendChild(filialNode);
    });
  }

  empresaNode.appendChild(children);

  // Clique no nome da empresa para expandir / recolher toda a árvore da empresa
  empresaNode.classList.add("collapsed");
  item.addEventListener("click", function () {
    empresaNode.classList.toggle("collapsed");
  });

  return empresaNode;
}

/**
 * Cria o nó para "Principal" ou uma "Filial".
 * Dentro dele, teremos as pastas de ano e arquivos dos documentos.
 */
function criarNoTipoEmpresa(empresa, labelTexto) {
  const node = document.createElement("div");
  node.className = "tree-node";

  const item = document.createElement("div");
  item.className = "tree-item";

  const toggle = document.createElement("span");
  toggle.className = "tree-toggle";
  toggle.textContent = "▸";

  const label = document.createElement("div");
  label.className = "tree-label tree-folder";

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = labelTexto === "Principal" ? "📁" : "🏬";

  const text = document.createElement("span");
  text.textContent = labelTexto;

  label.appendChild(icon);
  label.appendChild(text);

  item.appendChild(toggle);
  item.appendChild(label);

  node.appendChild(item);

  const children = document.createElement("div");
  children.className = "tree-children";

  // Os documentos foram salvos com um campo "ano" baseado na data de início
  const docs = empresa.documentos || {};
  const anos = new Set();

  ["pcmso", "ltcat", "pgr"].forEach((tipo) => {
    const doc = docs[tipo];
    if (doc && doc.ano) {
      anos.add(doc.ano);
    }
  });

  if (!anos.size) {
    const vazio = document.createElement("div");
    vazio.className = "tree-item tree-muted";
    vazio.textContent = "Nenhum documento cadastrado ainda.";
    children.appendChild(vazio);
  } else {
    Array.from(anos)
      .sort()
      .forEach((ano) => {
        const anoNode = criarNoAno(empresa, ano);
        children.appendChild(anoNode);
      });
  }

  node.appendChild(children);

  // Controle de expandir/recolher do nível "Principal" ou "Filial"
  node.classList.add("collapsed");
  item.addEventListener("click", function () {
    node.classList.toggle("collapsed");
    toggle.textContent = node.classList.contains("collapsed") ? "▸" : "▾";
  });

  return node;
}

/**
 * Cria o nó para um ano específico, contendo os 3 arquivos PDF.
 */
function criarNoAno(empresa, ano) {
  const node = document.createElement("div");
  node.className = "tree-node";

  const item = document.createElement("div");
  item.className = "tree-item";

  const toggle = document.createElement("span");
  toggle.className = "tree-toggle";
  toggle.textContent = "▸";

  const label = document.createElement("div");
  label.className = "tree-label tree-folder";

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = "📂";

  const text = document.createElement("span");
  text.textContent = ano;

  label.appendChild(icon);
  label.appendChild(text);

  item.appendChild(toggle);
  item.appendChild(label);

  node.appendChild(item);

  const children = document.createElement("div");
  children.className = "tree-children";

  const docs = empresa.documentos || {};
  ["pcmso", "ltcat", "pgr"].forEach((tipo) => {
    const doc = docs[tipo];
    if (!doc || doc.ano !== ano) return;

    const fileItem = document.createElement("div");
    fileItem.className = "tree-item tree-file";

    const fileLabel = document.createElement("div");
    fileLabel.className = "tree-label";

    const fileIcon = document.createElement("span");
    fileIcon.className = "tree-icon";
    fileIcon.textContent = "📄";

    const fileText = document.createElement("span");
    fileText.textContent = doc.nomeArquivo || `${tipo.toUpperCase()}.pdf`;

    fileLabel.appendChild(fileIcon);
    fileLabel.appendChild(fileText);

    fileItem.appendChild(fileLabel);

    children.appendChild(fileItem);
  });

  node.appendChild(children);

  // Clique para expandir/recolher apenas o nível do ano
  node.classList.add("collapsed");
  item.addEventListener("click", function () {
    node.classList.toggle("collapsed");
    toggle.textContent = node.classList.contains("collapsed") ? "▸" : "▾";
  });

  return node;
}


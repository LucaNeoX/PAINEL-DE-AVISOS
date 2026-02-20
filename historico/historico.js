/*
  Histórico (explorador de arquivos)
  Arquivo: /historico/historico.js

  MIGRAÇÃO SUPABASE:
  - Adaptado para carregar dados de forma assíncrona.
  - Adicionado suporte a clique nos arquivos para abrir o PDF.
*/

document.addEventListener("DOMContentLoaded", function () {
  const session = requireAuth();
  if (!session) return;

  fillSidebarUserInfo();
  registerLogoutButton();

  // Inicia carregamento da árvore
  montarArvoreHistorico();
});

/**
 * Monta a estrutura de pastas.
 */
async function montarArvoreHistorico() {
  const container = document.getElementById("tree-container");
  container.innerHTML = "<p class='text-muted'>Carregando histórico...</p>";

  try {
    const arvore = await getCompanyTree();
    container.innerHTML = ""; // Limpa feedback

    if (!arvore || !arvore.length) {
      container.innerHTML = "<p class='text-muted'>Nenhuma empresa encontrada.</p>";
      return;
    }

    // Cria o nó raiz invisível (apenas container)
    const root = document.createElement("div");
    root.className = "tree-root";

    arvore.forEach((grupo) => {
      // Cria nó da Empresa Principal (contém matriz e filiais dentro)
      const empresaNode = criarNoEmpresa(grupo.principal, grupo.filiais);
      root.appendChild(empresaNode);
    });

    container.appendChild(root);

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p class='error'>Erro ao carregar histórico.</p>";
  }
}

/**
 * Cria o nó visual de uma Empresa (Agrupador Principal).
 */
function criarNoEmpresa(principal, filiais) {
  // Container do nó
  const node = document.createElement("div");
  node.className = "tree-node";

  // Cabeçalho da Empresa (Nome da holding/grupo)
  const header = document.createElement("div");
  header.className = "tree-header tree-header-root";
  
  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = "🏢"; // Ícone de prédio

  const title = document.createElement("span");
  title.className = "tree-title";
  title.textContent = principal.nome.toUpperCase();

  header.appendChild(icon);
  header.appendChild(title);
  node.appendChild(header);

  // Container para os filhos (Matriz e Filiais)
  const children = document.createElement("div");
  children.className = "tree-children";

  // 1. Nó da Matriz (Documentos da principal)
  const matrizNode = criarNoUnidade(principal, "Matriz (Principal)");
  children.appendChild(matrizNode);

  // 2. Nós das Filiais
  if (filiais && filiais.length > 0) {
    filiais.forEach(filial => {
      const filialNode = criarNoUnidade(filial, `Filial: ${filial.nome}`);
      children.appendChild(filialNode);
    });
  }

  node.appendChild(children);
  
  // Expansão/Colapso ao clicar no header
  header.addEventListener("click", () => {
    node.classList.toggle("collapsed");
  });

  return node;
}

/**
 * Cria o nó de uma Unidade (Seja Matriz ou Filial).
 * Contém pastas por ANO.
 */
function criarNoUnidade(empresa, label) {
  const node = document.createElement("div");
  node.className = "tree-node collapsed"; // Inicia fechado para não poluir

  const header = document.createElement("div");
  header.className = "tree-header";

  const toggle = document.createElement("span");
  toggle.className = "tree-toggle";
  toggle.textContent = "▸";

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = "📂"; // Ícone de pasta

  const text = document.createElement("span");
  text.textContent = label;

  header.appendChild(toggle);
  header.appendChild(icon);
  header.appendChild(text);
  node.appendChild(header);

  const children = document.createElement("div");
  children.className = "tree-children";

  // Agrupa documentos por ano
  const docsPorAno = agruparDocumentosPorAno(empresa);
  const anos = Object.keys(docsPorAno).sort((a, b) => b - a); // Decrescente

  if (anos.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tree-empty";
    empty.textContent = "(Vazio)";
    children.appendChild(empty);
  } else {
    anos.forEach(ano => {
      const anoNode = criarNoAno(ano, docsPorAno[ano]);
      children.appendChild(anoNode);
    });
  }

  node.appendChild(children);

  header.addEventListener("click", (e) => {
    e.stopPropagation();
    node.classList.toggle("collapsed");
    toggle.textContent = node.classList.contains("collapsed") ? "▸" : "▾";
  });

  return node;
}

/**
 * Cria o nó de um ANO específico.
 * Contém os arquivos PDF.
 */
function criarNoAno(ano, documentos) {
  const node = document.createElement("div");
  node.className = "tree-node collapsed";

  const header = document.createElement("div");
  header.className = "tree-header";

  const toggle = document.createElement("span");
  toggle.className = "tree-toggle";
  toggle.textContent = "▸";

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = "📅"; 

  const text = document.createElement("span");
  text.textContent = ano;

  header.appendChild(toggle);
  header.appendChild(icon);
  header.appendChild(text);
  node.appendChild(header);

  const children = document.createElement("div");
  children.className = "tree-children";

  documentos.forEach(doc => {
    const fileNode = criarNoArquivo(doc);
    children.appendChild(fileNode);
  });

  node.appendChild(children);

  header.addEventListener("click", (e) => {
    e.stopPropagation();
    node.classList.toggle("collapsed");
    toggle.textContent = node.classList.contains("collapsed") ? "▸" : "▾";
  });

  return node;
}

/**
 * Cria o nó visual de um ARQUIVO PDF.
 */
function criarNoArquivo(doc) {
  const div = document.createElement("div");
  div.className = "tree-file";
  
  const icon = document.createElement("span");
  icon.textContent = "📄";
  
  const link = document.createElement("a");
  link.textContent = `${doc.tipoDoc} - ${doc.nomeArquivo}`;
  link.href = doc.url;
  link.target = "_blank"; // Abre em nova aba
  link.className = "tree-file-link";

  div.appendChild(icon);
  div.appendChild(link);

  return div;
}

/**
 * Helper: Varre os documentos da empresa e agrupa por ano.
 * Retorna: { "2024": [ {tipoDoc, nomeArquivo, url}... ], "2025": ... }
 */
function agruparDocumentosPorAno(empresa) {
  const docs = empresa.documentos || {};
  const grupos = {};

  ["pcmso", "ltcat", "pgr"].forEach(tipo => {
    const docInfo = docs[tipo]; // ex: { nomeArquivo: "...", dataUrl: "...", ano: "2024" }
    
    if (docInfo && docInfo.dataUrl) {
      // Tenta pegar o ano salvo, ou extrai da data de inicio da empresa, ou usa o ano atual
      let ano = docInfo.ano;
      if (!ano && empresa.dataInicio) {
        ano = empresa.dataInicio.substring(0, 4);
      }
      if (!ano) ano = "Sem Data";

      if (!grupos[ano]) grupos[ano] = [];

      grupos[ano].push({
        tipoDoc: tipo.toUpperCase(),
        nomeArquivo: docInfo.nomeArquivo || "Documento.pdf",
        url: docInfo.dataUrl
      });
    }
  });

  return grupos;
}

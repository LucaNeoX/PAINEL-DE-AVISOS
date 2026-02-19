/*
  Cadastro de Empresa / Filial
  Arquivo: /cadastro/cadastro.js

  Responsável por:
  - Verificar autenticação e perfil do usuário
  - Detectar se é cadastro de matriz ou filial (via query string)
  - Carregar dados de empresa para edição (apenas admin)
  - Validar campos e anexos (3 PDFs obrigatórios)
  - Converter PDFs para Base64 (data URL) e salvar no LocalStorage
*/

document.addEventListener("DOMContentLoaded", function () {
  const session = requireAuth();
  if (!session) return;

  fillSidebarUserInfo();
  registerLogoutButton();

  inicializarTelaCadastro(session);

  // Restringe o campo de CNPJ para aceitar apenas números e no máximo 14 dígitos.
  const cnpjInput = document.getElementById("cnpj");
  if (cnpjInput) {
    cnpjInput.addEventListener("input", function () {
      // Remove tudo que não for dígito
      let value = this.value.replace(/\D/g, "");
      // Limita a 14 caracteres
      if (value.length > 14) {
        value = value.slice(0, 14);
      }
      this.value = value;
    });
  }
});

/**
 * Lê parâmetros da URL para entender o contexto:
 *  - id: quando presente, indica edição de empresa existente.
 *  - tipo: "principal" (padrão) ou "filial".
 *  - parentId: usado quando estamos cadastrando uma filial.
 *  - parentName: nome da empresa principal (apenas para exibir no título).
 */
function obterParametrosURL() {
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get("id"),
    tipo: params.get("tipo") || "principal",
    parentCompanyId: params.get("parentId"),
    parentName: params.get("parentName"),
  };
}

/**
 * Configura a interface de acordo com:
 *  - Cadastro de matriz
 *  - Cadastro de filial
 *  - Edição de registro existente
 */
function inicializarTelaCadastro(session) {
  const { id, tipo, parentCompanyId, parentName } = obterParametrosURL();

  const inputId = document.getElementById("empresa-id");
  const inputTipo = document.getElementById("tipo");
  const inputParent = document.getElementById("parentCompanyId");

  const titulo = document.getElementById("cadastro-titulo");
  const subtitulo = document.getElementById("cadastro-subtitulo");

  const btnVoltar = document.getElementById("btn-voltar");

  inputTipo.value = tipo === "filial" ? "filial" : "principal";
  if (parentCompanyId) {
    inputParent.value = parentCompanyId;
  }

  if (tipo === "filial") {
    titulo.textContent = "Cadastrar filial";
    subtitulo.textContent = parentName
      ? `Filial vinculada à empresa: ${parentName}`
      : "Preencha os dados da filial vinculada à empresa principal.";
  } else {
    titulo.textContent = id ? "Editar empresa" : "Cadastrar empresa";
  }

  // Botão voltar sempre leva à tela de visualização
  btnVoltar.addEventListener("click", function () {
    window.location.href = "../visualizar/index.html";
  });

  // Se for edição (id presente), carregamos os dados
  if (id) {
    inputId.value = id;
    carregarEmpresaParaEdicao(id, session);
  }

  registrarEnvioFormulario(session);
}

/**
 * Preenche o formulário com os dados de uma empresa/filial existente.
 * - Se o usuário logado NÃO for admin, o formulário fica somente leitura.
 */
function carregarEmpresaParaEdicao(id, session) {
  const empresa = getCompanyById(id);
  if (!empresa) return;

  const inputTipo = document.getElementById("tipo");
  const inputParent = document.getElementById("parentCompanyId");

  document.getElementById("nomeEmpresa").value = empresa.nome || "";
  document.getElementById("cnpj").value = empresa.cnpj || "";
  document.getElementById("statusEmpresa").value =
    empresa.statusEmpresa || "Ativa";
  document.getElementById("dataInicio").value = empresa.dataInicio || "";
  document.getElementById("dataTermino").value = empresa.dataTermino || "";
  document.getElementById("esocial").value = empresa.esocial ? "sim" : "nao";
  document.getElementById("medicoCoordenador").value =
    empresa.medicoCoordenador || "";
  document.getElementById("observacoes").value = empresa.observacoes || "";

  inputTipo.value = empresa.tipo || "principal";
  inputParent.value = empresa.parentCompanyId || "";

  // Informações sobre os arquivos já existentes (não reexibimos o PDF em si)
  if (empresa.documentos) {
    if (empresa.documentos.pcmso) {
      document.getElementById("pcmpdf-info").textContent =
        "Arquivo já anexado: " + empresa.documentos.pcmso.nomeArquivo;
    }
    if (empresa.documentos.ltcat) {
      document.getElementById("ltcatpdf-info").textContent =
        "Arquivo já anexado: " + empresa.documentos.ltcat.nomeArquivo;
    }
    if (empresa.documentos.pgr) {
      document.getElementById("pgrpdf-info").textContent =
        "Arquivo já anexado: " + empresa.documentos.pgr.nomeArquivo;
    }
  }

  // Regra de permissão: apenas admin pode editar dados já cadastrados
  if (session.perfil !== "admin") {
    deixarFormularioSomenteLeitura();
  }
}

/**
 * Deixa todos os campos do formulário em modo somente leitura
 * (usado quando um usuário comum tenta editar um cadastro existente).
 */
function deixarFormularioSomenteLeitura() {
  const form = document.getElementById("empresa-form");
  const feedback = document.getElementById("empresa-feedback");

  Array.from(form.elements).forEach((el) => {
    if (
      el.tagName === "INPUT" ||
      el.tagName === "SELECT" ||
      el.tagName === "TEXTAREA"
    ) {
      el.disabled = true;
    }
  });

  const btnSalvar = document.getElementById("btn-salvar");
  btnSalvar.disabled = true;

  feedback.textContent =
    "Você está visualizando um cadastro existente. Apenas administradores podem editar.";
}

/**
 * Registra o comportamento do envio de formulário.
 * - Usuários comuns podem cadastrar novos registros (sem ID).
 * - Apenas admins podem editar (com ID preenchido).
 */
function registrarEnvioFormulario(session) {
  const form = document.getElementById("empresa-form");
  const feedback = document.getElementById("empresa-feedback");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    feedback.textContent = "";

    const idExistente = document.getElementById("empresa-id").value || null;
    const tipo = document.getElementById("tipo").value || "principal";
    const parentCompanyId =
      document.getElementById("parentCompanyId").value || null;

    if (idExistente && session.perfil !== "admin") {
      feedback.textContent =
        "Apenas administradores podem editar cadastros existentes.";
      return;
    }

    const nome = document.getElementById("nomeEmpresa").value.trim();
    const cnpj = document.getElementById("cnpj").value.trim();
    const statusEmpresa =
      document.getElementById("statusEmpresa").value || "Ativa";
    const dataInicio = document.getElementById("dataInicio").value;
    const dataTermino = document.getElementById("dataTermino").value;
    const esocialValue = document.getElementById("esocial").value;
    const medicoCoordenador = document
      .getElementById("medicoCoordenador")
      .value.trim();
    const observacoes =
      document.getElementById("observacoes").value.trim() || "";

    // Referências aos campos de arquivo e informações
    const pcmsInput = document.getElementById("pcmpdf");
    const ltcatInput = document.getElementById("ltcatpdf");
    const pgrInput = document.getElementById("pgrpdf");

    if (!nome || !cnpj || !dataInicio || !dataTermino || !medicoCoordenador) {
      feedback.textContent =
        "Preencha todos os campos obrigatórios do formulário.";
      return;
    }

    // Validação específica do CNPJ: exatamente 14 dígitos numéricos.
    if (!/^\d{14}$/.test(cnpj)) {
      feedback.textContent = "O CNPJ deve conter exatamente 14 números.";
      return;
    }

    // Validação do tipo de arquivo: apenas PDF
    const arquivos = {
      pcmso: pcmsInput.files[0] || null,
      ltcat: ltcatInput.files[0] || null,
      pgr: pgrInput.files[0] || null,
    };

    const empresaExistente = idExistente ? getCompanyById(idExistente) : null;

    // Usuário pode estar editando e já ter PDFs salvos anteriormente.
    // Regra: "Não permitir cadastro sem os 3 arquivos".
    // Interpretação: na criação, os 3 devem ser anexados;
    // na edição, o registro pode reaproveitar os arquivos já existentes,
    // sem obrigar o usuário a reenviá-los.
    const precisaValidarTodosArquivos = !empresaExistente;

    if (precisaValidarTodosArquivos) {
      if (!arquivos.pcmso || !arquivos.ltcat || !arquivos.pgr) {
        feedback.textContent =
          "Para cadastrar, é obrigatório anexar os três PDFs: PCMSO, LTCAT e PGR.";
        return;
      }
    }

    // Verificação de que os arquivos selecionados são PDFs
    for (const [tipoDoc, file] of Object.entries(arquivos)) {
      if (file && file.type !== "application/pdf") {
        feedback.textContent = `O arquivo selecionado para ${tipoDoc.toUpperCase()} não é um PDF válido.`;
        return;
      }
    }

    // Função auxiliar para seguir com o salvamento depois que
    // os arquivos forem convertidos para Base64.
    const salvarComDocumentos = (documentos) => {
      const anoBase = dataInicio ? dataInicio.slice(0, 4) : null;

      const payload = {
        tipo,
        parentCompanyId,
        nome,
        cnpj,
        statusEmpresa,
        dataInicio,
        dataTermino,
        esocial: esocialValue === "sim",
        medicoCoordenador,
        observacoes,
        documentos: {
          pcmso: {
            ...(empresaExistente?.documentos?.pcmso || {}),
            ...documentos.pcmso,
            ano: anoBase,
          },
          ltcat: {
            ...(empresaExistente?.documentos?.ltcat || {}),
            ...documentos.ltcat,
            ano: anoBase,
          },
          pgr: {
            ...(empresaExistente?.documentos?.pgr || {}),
            ...documentos.pgr,
            ano: anoBase,
          },
        },
      };

      let result;
      if (idExistente) {
        result = updateCompany(idExistente, payload);
      } else {
        result = addCompany(payload);
      }

      if (!result) {
        feedback.textContent =
          "Não foi possível salvar os dados. Tente novamente.";
        return;
      }

      feedback.classList.remove("error");
      feedback.classList.add("success");
      feedback.textContent = "Cadastro salvo com sucesso!";

      // Após alguns segundos, volta para tela de visualização
      setTimeout(() => {
        window.location.href = "../visualizar/index.html";
      }, 1000);
    };

    // Converte arquivos em Base64 (apenas os que foram enviados)
    converterArquivosParaBase64(arquivos, empresaExistente, salvarComDocumentos);
  });
}

/**
 * Converte os arquivos selecionados (PCMSO, LTCAT, PGR) para Base64
 * usando FileReader.
 * - Para documentos não enviados em edição, reaproveita os dados já existentes.
 */
function converterArquivosParaBase64(arquivos, empresaExistente, callback) {
  const resultado = {
    pcmso: empresaExistente?.documentos?.pcmso || {},
    ltcat: empresaExistente?.documentos?.ltcat || {},
    pgr: empresaExistente?.documentos?.pgr || {},
  };

  const entradas = Object.entries(arquivos);
  let pendentes = entradas.length;

  if (pendentes === 0) {
    callback(resultado);
    return;
  }

  entradas.forEach(([tipo, file]) => {
    if (!file) {
      pendentes -= 1;
      if (pendentes === 0) callback(resultado);
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      resultado[tipo] = {
        nomeArquivo: file.name,
        dataUploadISO: new Date().toISOString(),
        dataUrl: e.target.result,
      };
      pendentes -= 1;
      if (pendentes === 0) {
        callback(resultado);
      }
    };

    reader.onerror = function () {
      console.error("Erro ao ler arquivo PDF:", file.name);
      pendentes -= 1;
      if (pendentes === 0) {
        callback(resultado);
      }
    };

    reader.readAsDataURL(file);
  });
}


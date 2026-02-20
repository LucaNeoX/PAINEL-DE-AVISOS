document.addEventListener("DOMContentLoaded", function () {
  // Verifica autenticação
  const session = requireAuth();
  if (!session) return;

  // Carrega informações da sidebar
  fillSidebarUserInfo();
  registerLogoutButton();

  // Inicializa tela
  inicializarTelaCadastro(session);

  // Validação de CNPJ
  const cnpjInput = document.getElementById("cnpj");
  if (cnpjInput) {
    cnpjInput.addEventListener("input", function () {
      let value = this.value.replace(/\D/g, "");
      if (value.length > 14) value = value.slice(0, 14);
      this.value = value;
    });
  }
});

/**
 * Lê parâmetros da URL para entender o contexto:
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
 * Configura a interface de acordo com o contexto.
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
  if (parentCompanyId) inputParent.value = parentCompanyId;

  if (tipo === "filial") {
    titulo.textContent = "Cadastrar filial";
    subtitulo.textContent = parentName
      ? `Filial vinculada à empresa: ${parentName}`
      : "Preencha os dados da filial vinculada à empresa principal.";
  } else {
    titulo.textContent = id ? "Editar empresa" : "Cadastrar empresa";
  }

  btnVoltar.addEventListener("click", function () {
    window.location.href = "../visualizar/index.html";
  });

  if (id) {
    inputId.value = id;
    carregarEmpresaParaEdicao(id, session);
  }

  registrarEnvioFormulario(session);
}

/**
 * Carrega dados para edição.
 */
async function carregarEmpresaParaEdicao(id, session) {
  try {
    const empresa = await getCompanyById(id);
    if (!empresa) {
      alert("Empresa não encontrada.");
      window.location.href = "../visualizar/index.html";
      return;
    }

    // Preenche formulário básico
    document.getElementById("nomeEmpresa").value = empresa.nome || "";
    document.getElementById("cnpj").value = empresa.cnpj || "";
    document.getElementById("statusEmpresa").value = empresa.statusEmpresa || "Ativa";
    document.getElementById("esocial").value = empresa.esocial ? "sim" : "nao";
    document.getElementById("medicoCoordenador").value = empresa.medicoCoordenador || "";
    document.getElementById("observacoes").value = empresa.observacoes || "";

    document.getElementById("tipo").value = empresa.tipo || "principal";
    document.getElementById("parentCompanyId").value = empresa.parentCompanyId || "";

    // Informações sobre arquivos já existentes e DATAS individuais
    let docs = empresa.documentos || {};
    if (typeof docs === 'string') {
        try { docs = JSON.parse(docs); } catch(e) {}
    }
    
    // Função auxiliar para preencher arquivo e datas
    const fillDoc = (tipo, prefixo) => {
        const docObj = docs[tipo];
        const elInfo = document.getElementById(`${prefixo}pdf-info`);
        
        // Datas: usa a data específica do documento. 
        // Se não existir, tenta usar a data global antiga da empresa como fallback.
        const dataInicio = docObj?.dataInicio || empresa.dataInicio || "";
        const dataTermino = docObj?.dataTermino || empresa.dataTermino || "";

        document.getElementById(`${prefixo}-inicio`).value = dataInicio;
        document.getElementById(`${prefixo}-termino`).value = dataTermino;

        if (docObj && docObj.nomeArquivo) {
            elInfo.innerHTML = `<span style="color: green; font-weight: bold;">✓ Arquivo atual: ${docObj.nomeArquivo}</span>`;
        } else {
            elInfo.textContent = "";
        }
    };

    fillDoc("pcmso", "pcm"); // prefixo no HTML é 'pcmpdf' -> mas inputs de data são 'pcmso-inicio'
    // Ajuste: no HTML criei 'pcmso-inicio', mas input file é 'pcmpdf'. 
    // Vou ajustar a chamada para bater com os IDs criados no HTML.

    // PCMSO
    const pcmDoc = docs.pcmso;
    document.getElementById("pcmso-inicio").value = pcmDoc?.dataInicio || empresa.dataInicio || "";
    document.getElementById("pcmso-termino").value = pcmDoc?.dataTermino || empresa.dataTermino || "";
    if (pcmDoc?.nomeArquivo) document.getElementById("pcmpdf-info").innerHTML = `<b>✓ ${pcmDoc.nomeArquivo}</b>`;

    // LTCAT
    const ltcatDoc = docs.ltcat;
    document.getElementById("ltcat-inicio").value = ltcatDoc?.dataInicio || empresa.dataInicio || "";
    document.getElementById("ltcat-termino").value = ltcatDoc?.dataTermino || empresa.dataTermino || "";
    if (ltcatDoc?.nomeArquivo) document.getElementById("ltcatpdf-info").innerHTML = `<b>✓ ${ltcatDoc.nomeArquivo}</b>`;

    // PGR
    const pgrDoc = docs.pgr;
    document.getElementById("pgr-inicio").value = pgrDoc?.dataInicio || empresa.dataInicio || "";
    document.getElementById("pgr-termino").value = pgrDoc?.dataTermino || empresa.dataTermino || "";
    if (pgrDoc?.nomeArquivo) document.getElementById("pgrpdf-info").innerHTML = `<b>✓ ${pgrDoc.nomeArquivo}</b>`;

  } catch (err) {
    console.error("Erro ao carregar edição:", err);
  }
}

/**
 * Envia arquivo para o Supabase Storage.
 * Retorna a URL pública.
 */
async function uploadFileToStorage(file, empresaNome, tipoDoc) {
  if (!file) return null;

  // Sanitiza nome do arquivo
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `${empresaNome.replace(/[^a-zA-Z0-9]/g, "_")}/${tipoDoc.toLowerCase()}_${Date.now()}_${safeName}`;

  const { data, error } = await supabase.storage
    .from('documentos')
    .upload(path, file);

  if (error) {
    console.error("Erro no upload:", error);
    return null;
  }

  // Pega URL pública
  const { data: urlData } = supabase.storage
    .from('documentos')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * Registra o envio do formulário.
 */
function registrarEnvioFormulario(session) {
  const form = document.getElementById("empresa-form");
  const feedback = document.getElementById("empresa-feedback");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    feedback.textContent = "";
    feedback.classList.remove("success", "error");

    const btnSalvar = document.getElementById("btn-salvar");
    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    const idExistente = document.getElementById("empresa-id").value || null;
    const tipo = document.getElementById("tipo").value || "principal";
    const parentCompanyId = document.getElementById("parentCompanyId").value || null;

    const nome = document.getElementById("nomeEmpresa").value.trim();
    const cnpj = document.getElementById("cnpj").value.trim();
    const statusEmpresa = document.getElementById("statusEmpresa").value;
    const esocialValue = document.getElementById("esocial").value;
    const medicoCoordenador = document.getElementById("medicoCoordenador").value.trim();
    const observacoes = document.getElementById("observacoes").value.trim();

    // Captura datas individuais
    const pcmInicio = document.getElementById("pcmso-inicio").value;
    const pcmTermino = document.getElementById("pcmso-termino").value;
    
    const ltcatInicio = document.getElementById("ltcat-inicio").value;
    const ltcatTermino = document.getElementById("ltcat-termino").value;
    
    const pgrInicio = document.getElementById("pgr-inicio").value;
    const pgrTermino = document.getElementById("pgr-termino").value;

    // Validações básicas (apenas campos obrigatórios globais)
    if (!nome || !cnpj || !medicoCoordenador) {
      feedback.textContent = "Preencha os campos de identificação da empresa.";
      feedback.classList.add("error");
      btnSalvar.disabled = false;
      return;
    }

    if (!/^\d{14}$/.test(cnpj)) {
      feedback.textContent = "CNPJ inválido (deve conter 14 dígitos).";
      feedback.classList.add("error");
      btnSalvar.disabled = false;
      return;
    }

    // Processamento de arquivos
    const pcmsInput = document.getElementById("pcmpdf");
    const ltcatInput = document.getElementById("ltcatpdf");
    const pgrInput = document.getElementById("pgrpdf");

    const arquivos = {
      pcmso: pcmsInput.files[0] || null,
      ltcat: ltcatInput.files[0] || null,
      pgr: pgrInput.files[0] || null,
    };

    let empresaExistente = null;
    if (idExistente) {
      empresaExistente = await getCompanyById(idExistente);
    }

    // Regra: "Não permitir cadastro sem os 3 arquivos" (apenas se for nova empresa)
    // Se for edição, pode salvar sem re-enviar arquivo, DESDE QUE as datas estejam preenchidas.
    
    // Validação de datas: Para cada documento que EXISTE (novo ou antigo), as datas são obrigatórias.
    // Como saber se existe? Se tem arquivo novo OU se já existia no banco.

    const checkDocExists = (tipo, fileInput) => {
        if (fileInput) return true; // Está enviando agora
        if (empresaExistente && empresaExistente.documentos && empresaExistente.documentos[tipo]) return true; // Já tinha
        return false;
    };

    // Valida datas apenas para documentos que vão existir
    if (checkDocExists("pcmso", arquivos.pcmso)) {
        if (!pcmInicio || !pcmTermino) {
            feedback.textContent = "Preencha as datas de vigência do PCMSO.";
            feedback.classList.add("error");
            btnSalvar.disabled = false;
            return;
        }
    }
    if (checkDocExists("ltcat", arquivos.ltcat)) {
        if (!ltcatInicio || !ltcatTermino) {
            feedback.textContent = "Preencha as datas de vigência do LTCAT.";
            feedback.classList.add("error");
            btnSalvar.disabled = false;
            return;
        }
    }
    if (checkDocExists("pgr", arquivos.pgr)) {
        if (!pgrInicio || !pgrTermino) {
            feedback.textContent = "Preencha as datas de vigência do PGR.";
            feedback.classList.add("error");
            btnSalvar.disabled = false;
            return;
        }
    }
    
    // Se for nova empresa, continua exigindo os 3 arquivos
    if (!idExistente) {
      if (!arquivos.pcmso || !arquivos.ltcat || !arquivos.pgr) {
        feedback.textContent = "Para cadastrar, anexe os três PDFs obrigatórios.";
        feedback.classList.add("error");
        btnSalvar.disabled = false;
        return;
      }
    }

    // Processar upload de arquivos e salvar dados
    const documentosFinais = empresaExistente?.documentos || {};

    try {
      // Função helper para montar objeto do documento
      const updateDocData = async (tipo, file, inicio, termino) => {
          // Se enviou arquivo novo, faz upload
          if (file) {
             const url = await uploadFileToStorage(file, nome, tipo.toUpperCase());
             documentosFinais[tipo] = {
                 nomeArquivo: file.name,
                 dataUploadISO: new Date().toISOString(),
                 dataUrl: url,
                 ano: inicio.slice(0, 4),
                 dataInicio: inicio,
                 dataTermino: termino
             };
          } else if (documentosFinais[tipo]) {
             // Se não enviou arquivo mas documento existe, atualiza apenas as datas
             documentosFinais[tipo].dataInicio = inicio;
             documentosFinais[tipo].dataTermino = termino;
             documentosFinais[tipo].ano = inicio.slice(0, 4);
          }
      };

      await updateDocData("pcmso", arquivos.pcmso, pcmInicio, pcmTermino);
      await updateDocData("ltcat", arquivos.ltcat, ltcatInicio, ltcatTermino);
      await updateDocData("pgr", arquivos.pgr, pgrInicio, pgrTermino);

      // Preparar objeto para salvar
      // Nota: Mantemos dataInicio/dataTermino na raiz da empresa apenas como referência geral (ex: menor dataInicio e maior dataTermino)
      // ou deixamos vazio se não for mais usado.
      // Para compatibilidade, vamos salvar a MAIOR data de término como referência de "contrato ativo".
      
      const datasTermino = [pcmTermino, ltcatTermino, pgrTermino].filter(d => d).sort();
      const maiorTermino = datasTermino.length ? datasTermino[datasTermino.length - 1] : null;
      const datasInicio = [pcmInicio, ltcatInicio, pgrInicio].filter(d => d).sort();
      const menorInicio = datasInicio.length ? datasInicio[0] : null;

      const payload = {
        tipo,
        parentCompanyId,
        nome,
        cnpj,
        statusEmpresa,
        dataInicio: menorInicio, // Referência
        dataTermino: maiorTermino, // Referência
        esocial: esocialValue === "sim",
        medicoCoordenador,
        observacoes,
        documentos: documentosFinais,
      };

      let result;
      if (idExistente) {
        result = await updateCompany(idExistente, payload);
      } else {
        result = await addCompany(payload);
      }

      if (result) {
        feedback.textContent = "Cadastro salvo com sucesso!";
        feedback.classList.add("success");
        setTimeout(() => {
          window.location.href = "../visualizar/index.html";
        }, 1500);
      } else {
        throw new Error("Falha ao salvar no banco de dados.");
      }

    } catch (err) {
      console.error(err);
      feedback.textContent = "Erro ao processar cadastro: " + err.message;
      feedback.classList.add("error");
      btnSalvar.disabled = false;
      btnSalvar.textContent = "Salvar cadastro";
    }
  });
}

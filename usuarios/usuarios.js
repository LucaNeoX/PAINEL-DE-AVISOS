/*
  Gestão de Usuários
  Arquivo: /usuarios/usuarios.js

  Responsável por:
  - Garantir que somente ADMIN acesse esta tela
  - Cadastrar novos usuários com validação
  - Editar usuários existentes
  - Excluir usuários (com restrições)

  Sobre o LocalStorage:
  - A lista de usuários é armazenada na chave AUTH_STORAGE_KEYS.USERS
    (definida em auth.js) no formato:
      [
        { id, nome, email, senha, perfil },
        ...
      ]
  - Aqui usamos as funções utilitárias:
      getUsers()  -> lê o array completo
      saveUsers() -> sobrescreve o array
*/

document.addEventListener("DOMContentLoaded", function () {
  const session = requireAuth();
  if (!session) return;

  // Regra de permissão:
  // - Se o usuário logado não for ADMIN, ele é redirecionado para o dashboard.
  if (!isAdmin()) {
    window.location.href = "../dashboard/index.html";
    return;
  }

  fillSidebarUserInfo();
  registerLogoutButton();

  inicializarGestaoUsuarios(session);
});

/**
 * Inicializa eventos de formulário e monta a listagem inicial de usuários.
 */
function inicializarGestaoUsuarios(session) {
  const form = document.getElementById("usuario-form");
  const btnLimpar = document.getElementById("btn-limpar-usuario");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    salvarUsuario(session);
  });

  btnLimpar.addEventListener("click", function () {
    limparFormulario();
  });

  montarTabelaUsuarios(session);
}

/**
 * Executa as validações do formulário e salva (cria/edita) o usuário.
 */
function salvarUsuario(session) {
  const id = document.getElementById("usuario-id").value || null;
  const nome = document.getElementById("nomeUsuario").value.trim();
  const email = document.getElementById("emailUsuario").value.trim();
  const senha = document.getElementById("senhaUsuario").value;
  const perfil = document.getElementById("perfilUsuario").value;
  const feedback = document.getElementById("usuario-feedback");

  feedback.classList.remove("success");
  feedback.classList.add("error");
  feedback.textContent = "";

  if (!nome || !email || !senha || !perfil) {
    feedback.textContent = "Preencha todos os campos obrigatórios.";
    return;
  }

  if (senha.length < 6) {
    feedback.textContent = "A senha deve ter no mínimo 6 caracteres.";
    return;
  }

  const users = getUsers();
  const emailNormalizado = email.trim().toLowerCase();

  // Validação de e-mail duplicado:
  // - Não permite dois usuários com o mesmo e-mail.
  const emailJaExiste = users.some(
    (u) =>
      u.email.trim().toLowerCase() === emailNormalizado &&
      (!id || u.id !== id)
  );

  if (emailJaExiste) {
    feedback.textContent =
      "Já existe um usuário cadastrado com este e-mail. Escolha outro.";
    return;
  }

  let usuariosAtualizados;

  if (id) {
    // Edição de usuário existente
    usuariosAtualizados = users.map((u) =>
      u.id === id
        ? {
            ...u,
            nome,
            email,
            senha,
            perfil,
          }
        : u
    );
  } else {
    // Criação de novo usuário
    const novoUsuario = {
      id: gerarIdUsuario(),
      nome,
      email,
      senha,
      perfil,
    };
    usuariosAtualizados = [...users, novoUsuario];
  }

  saveUsers(usuariosAtualizados);

  feedback.classList.remove("error");
  feedback.classList.add("success");
  feedback.textContent = "Usuário salvo com sucesso.";

  limparFormulario();
  montarTabelaUsuarios(session);
}

/**
 * Gera um ID simples para usuários, independente da lógica de empresas.
 */
function gerarIdUsuario() {
  const random = Math.floor(Math.random() * 1_000_000);
  return `usr_${Date.now()}_${random}`;
}

/**
 * Limpa o formulário para estado de "novo cadastro".
 */
function limparFormulario() {
  document.getElementById("usuario-id").value = "";
  document.getElementById("nomeUsuario").value = "";
  document.getElementById("emailUsuario").value = "";
  document.getElementById("senhaUsuario").value = "";
  document.getElementById("perfilUsuario").value = "admin";

  const feedback = document.getElementById("usuario-feedback");
  feedback.textContent = "";
  feedback.classList.remove("success");
  feedback.classList.add("error");
}

/**
 * Monta a tabela de usuários abaixo do formulário.
 * - Exibe nome, e-mail, perfil e ações (editar/excluir).
 * - As ações são aplicadas apenas para ADMIN, mas como esta tela já
 *   bloqueia acesso de não admins, aqui só reforçamos as regras
 *   de exclusão (sem permitir apagar o próprio usuário ou o admin padrão).
 */
function montarTabelaUsuarios(session) {
  const container = document.getElementById("usuarios-lista-container");
  container.innerHTML = "";

  const users = getUsers();

  if (!users.length) {
    const empty = document.createElement("p");
    empty.className = "text-muted";
    empty.textContent = "Nenhum usuário cadastrado.";
    container.appendChild(empty);
    return;
  }

  const tabela = document.createElement("table");
  tabela.className = "usuarios-tabela";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Nome</th>
      <th>E-mail</th>
      <th>Perfil</th>
      <th style="width: 150px;">Ações</th>
    </tr>
  `;

  const tbody = document.createElement("tbody");

  users.forEach((user) => {
    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    tdNome.textContent = user.nome;
    tdNome.setAttribute("data-label", "Nome");

    const tdEmail = document.createElement("td");
    tdEmail.textContent = user.email;
    tdEmail.setAttribute("data-label", "E-mail");

    const tdPerfil = document.createElement("td");
    const badge = document.createElement("span");
    badge.className =
      "usuarios-badge-perfil " +
      (user.perfil === "admin" ? "admin" : "usuario");
    badge.textContent =
      user.perfil === "admin" ? "Administrador" : "Usuário padrão";
    tdPerfil.appendChild(badge);
    tdPerfil.setAttribute("data-label", "Perfil");

    const tdAcoes = document.createElement("td");
    tdAcoes.className = "usuarios-acoes";
    tdAcoes.setAttribute("data-label", "Ações");

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "btn btn-secondary";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", function () {
      preencherFormularioEdicao(user);
    });

    const btnExcluir = document.createElement("button");
    btnExcluir.type = "button";
    btnExcluir.className = "btn btn-danger";
    btnExcluir.textContent = "Excluir";
    btnExcluir.addEventListener("click", function () {
      excluirUsuario(user, session);
    });

    tdAcoes.appendChild(btnEditar);
    tdAcoes.appendChild(btnExcluir);

    tr.appendChild(tdNome);
    tr.appendChild(tdEmail);
    tr.appendChild(tdPerfil);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });

  tabela.appendChild(thead);
  tabela.appendChild(tbody);
  container.appendChild(tabela);

  const hint = document.createElement("p");
  hint.className = "usuarios-hint";
  hint.textContent =
    "Dica: o administrador principal padrão (lucas@gmail.com) e o usuário logado não podem ser excluídos.";
  container.appendChild(hint);
}

/**
 * Preenche o formulário com os dados de um usuário selecionado
 * para edição.
 */
function preencherFormularioEdicao(user) {
  document.getElementById("usuario-id").value = user.id;
  document.getElementById("nomeUsuario").value = user.nome;
  document.getElementById("emailUsuario").value = user.email;
  document.getElementById("senhaUsuario").value = user.senha;
  document.getElementById("perfilUsuario").value = user.perfil;

  const feedback = document.getElementById("usuario-feedback");
  feedback.textContent = "Editando usuário existente. Salve para aplicar.";
  feedback.classList.remove("error");
  feedback.classList.add("success");
}

/**
 * Exclui um usuário respeitando as regras:
 * - Não permitir excluir o próprio usuário logado
 * - Não permitir excluir o admin principal padrão (lucas@gmail.com)
 */
function excluirUsuario(user, session) {
  // Regra 1: não permitir excluir o próprio usuário logado
  if (user.id === session.id) {
    alert("Você não pode excluir o usuário atualmente logado.");
    return;
  }

  // Regra 2: não permitir excluir o admin principal padrão
  const emailAdminPadrao = "lucas@gmail.com";
  if (
    user.id === "u-admin" ||
    user.email.trim().toLowerCase() === emailAdminPadrao
  ) {
    alert("Não é permitido excluir o administrador principal padrão.");
    return;
  }

  if (
    !confirm(
      `Tem certeza que deseja excluir o usuário "${user.nome}" (${user.email})?`
    )
  ) {
    return;
  }

  const users = getUsers();
  const filtrados = users.filter((u) => u.id !== user.id);
  saveUsers(filtrados);

  montarTabelaUsuarios(session);
}


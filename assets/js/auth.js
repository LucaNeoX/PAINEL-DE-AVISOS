/*
  Sistema de Controle de Documentos Ocupacionais
  Arquivo: assets/js/auth.js

  Responsável por:
  - Gerenciar usuários (apenas em memória LocalStorage, sem backend real)
  - Autenticar login (email/senha)
  - Manter sessão ativa (LocalStorage)
  - Bloquear acesso às páginas sem login
  - Controlar permissões por perfil (admin / usuario)

  IMPORTANTE:
  - Este código foi pensado para DEMONSTRAÇÃO / ESTUDO.
  - Não utilizar esta abordagem em produção real, pois:
    * As senhas ficam salvas em texto puro no LocalStorage.
    * Não há criptografia nem validação segura.
*/

// Chaves padrão utilizadas no LocalStorage
const AUTH_STORAGE_KEYS = {
  USERS: "scdo_users",
  SESSION: "scdo_session",
};

/**
 * Inicializa a lista de usuários padrão no LocalStorage.
 * - Garante o usuário admin padrão (email/senha definidos no código)
 * - Cria um usuário comum de exemplo, se não existir.
 * - Faz migração automática do admin antigo (lucas@gmail.com / 1234567)
 *   para o novo usuário padrão, caso já exista LocalStorage antigo.
 */
function initDefaultUsers() {
  const existingRaw = localStorage.getItem(AUTH_STORAGE_KEYS.USERS);
  let users = [];

  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw);
      if (Array.isArray(parsed)) {
        users = parsed;
      }
    } catch (e) {
      console.error("Erro ao ler usuários existentes, recriando padrão:", e);
    }
  }

  // Garante sempre a existência de um admin padrão com as credenciais atuais
  const adminData = {
    id: "u-admin",
    nome: "Administrador (Admin)",
    email: "pereira@gmai.come",
    senha: "12345678",
    perfil: "admin", // pode cadastrar e editar
  };

  const adminIndex = users.findIndex(
    (u) => u.id === "u-admin" || u.perfil === "admin"
  );

  if (adminIndex === -1) {
    users.push(adminData);
  } else {
    users[adminIndex] = {
      ...users[adminIndex],
      ...adminData,
    };
  }

  // Garante também um usuário de exemplo, se não existir
  if (
    !users.some(
      (u) => u.id === "u-usuario" || u.email === "usuario@example.com"
    )
  ) {
    users.push({
      id: "u-usuario",
      nome: "Usuário Padrão",
      email: "usuario@example.com",
      senha: "123456",
      perfil: "usuario", // pode cadastrar, mas não editar registros já salvos
    });
  }

  localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
}

/**
 * Retorna o array de usuários cadastrados no LocalStorage.
 */
function getUsers() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USERS);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao ler usuários do LocalStorage:", e);
    return [];
  }
}

/**
 * Sobrescreve a lista completa de usuários no LocalStorage.
 * - Função de utilidade para a tela de administração de usuários.
 */
function saveUsers(users) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error("Erro ao salvar usuários no LocalStorage:", e);
  }
}

/**
 * Autentica o usuário com base em email e senha.
 * - Em caso de sucesso, grava a sessão no LocalStorage.
 * - Em caso de falha, retorna um objeto com erro.
 */
function login(email, senha) {
  const users = getUsers();

  const found = users.find(
    (u) =>
      u.email.trim().toLowerCase() === email.trim().toLowerCase() &&
      u.senha === senha
  );

  if (!found) {
    return {
      ok: false,
      message: "Usuário ou senha inválidos.",
    };
  }

  const session = {
    id: found.id,
    nome: found.nome,
    email: found.email,
    perfil: found.perfil, // "admin" ou "usuario"
    loginAt: new Date().toISOString(),
  };

  localStorage.setItem(AUTH_STORAGE_KEYS.SESSION, JSON.stringify(session));

  return {
    ok: true,
    user: session,
  };
}

/**
 * Encerra a sessão atual.
 * - Remove a chave de sessão do LocalStorage.
 */
function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION);
}

/**
 * Retorna o usuário logado (sessão) ou null se não houver sessão.
 */
function getCurrentSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEYS.SESSION);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao ler sessão do LocalStorage:", e);
    return null;
  }
}

/**
 * Verifica se há sessão ativa; se não houver, redireciona para o login.
 * - Deve ser chamado logo no início de cada página interna (dashboard, cadastro, etc).
 */
function requireAuth() {
  const session = getCurrentSession();
  if (!session) {
    // Caso não exista sessão, força a ida para a tela de login.
    window.location.href = "../login/index.html";
    return null;
  }
  return session;
}

/**
 * Verifica se o usuário atual é admin.
 * - Retorna true ou false.
 */
function isAdmin() {
  const session = getCurrentSession();
  return session && session.perfil === "admin";
}

/**
 * Aplica regras de permissão visuais no menu lateral:
 * - Esconde itens marcados com [data-admin-only] quando o usuário
 *   logado não é administrador.
 * - Esta função é chamada em todas as páginas internas.
 */
function applyRoleBasedMenu() {
  const session = getCurrentSession();
  const isUserAdmin = session && session.perfil === "admin";

  const adminOnlyItems = document.querySelectorAll("[data-admin-only]");
  adminOnlyItems.forEach((el) => {
    if (!isUserAdmin) {
      // Esconde completamente a opção do menu para usuários comuns.
      el.style.display = "none";
    } else {
      el.style.display = "";
    }
  });
}

/**
 * Preenche as informações básicas do usuário logado na sidebar
 * (nome e perfil), se os elementos existirem na página.
 */
function fillSidebarUserInfo() {
  const session = getCurrentSession();
  if (!session) return;

  const nameEl = document.querySelector("[data-sidebar-user-name]");
  const roleEl = document.querySelector("[data-sidebar-user-role]");
  const avatarEl = document.querySelector("[data-sidebar-user-avatar]");

  if (nameEl) {
    nameEl.textContent = session.nome || session.email;
  }

  if (roleEl) {
    const roleLabel =
      session.perfil === "admin" ? "Administrador" : "Usuário padrão";
    roleEl.textContent = roleLabel;
  }

  if (avatarEl) {
    // Coloca as iniciais do usuário no avatar
    const initials =
      (session.nome || session.email || "?")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "?";
    avatarEl.textContent = initials;
  }
}

/**
 * Registra o comportamento do botão de logout existente na sidebar,
 * caso o elemento esteja presente.
 */
function registerLogoutButton() {
  const logoutBtn = document.querySelector("[data-action='logout']");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", function () {
    logout();
    window.location.href = "../login/index.html";
  });
}

// Inicialização imediata deste módulo:
// - Garante que os usuários padrão existam logo que qualquer página carregue.
initDefaultUsers();

// Quando o DOM estiver pronto, aplicamos as regras de menu
// baseadas no perfil do usuário (admin x usuário comum).
document.addEventListener("DOMContentLoaded", function () {
  applyRoleBasedMenu();
});


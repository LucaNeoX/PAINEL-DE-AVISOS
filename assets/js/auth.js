/*
  Sistema de Controle de Documentos Ocupacionais
  Arquivo: assets/js/auth.js

  MIGRAÇÃO SUPABASE COMPLETA:
  - Login via Supabase Auth.
  - Verificação de perfil na tabela 'profiles' (Admin vs Usuário).
  - Persistência de sessão local.
*/

const AUTH_STORAGE_KEYS = {
  SESSION: "scdo_session_supabase",
};

/**
 * Autentica o usuário com Supabase Auth e carrega seu perfil.
 */
async function login(email, password) {
  if (!supabase) return { ok: false, message: "Erro de conexão com Supabase." };

  // 1. Autenticação básica (Email/Senha)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return {
      ok: false,
      message: "Email ou senha incorretos.",
    };
  }

  // 2. Busca o perfil do usuário na tabela 'profiles' para saber se é Admin
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('perfil, nome')
    .eq('id', authData.user.id)
    .single();

  // Se não tiver perfil, assume "usuario" por segurança
  const userRole = profileData ? profileData.perfil : "usuario";
  const userName = profileData ? profileData.nome : email.split('@')[0];

  // 3. Cria objeto de sessão
  const sessionData = {
    id: authData.user.id,
    email: authData.user.email,
    perfil: userRole, // Aqui está o segredo: pegamos o perfil real do banco
    nome: userName,
    token: authData.session.access_token,
    loginAt: new Date().toISOString()
  };

  // 4. Salva no LocalStorage para acesso rápido nas páginas
  localStorage.setItem(AUTH_STORAGE_KEYS.SESSION, JSON.stringify(sessionData));

  return { ok: true, user: sessionData };
}

/**
 * Encerra a sessão.
 */
async function logout() {
  if (supabase) await supabase.auth.signOut();
  localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION);
}

/**
 * Retorna a sessão atual (do cache local).
 */
function getCurrentSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEYS.SESSION);
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * Verifica se há sessão ativa.
 * Se não houver, redireciona para o login.
 */
function requireAuth() {
  const session = getCurrentSession();
  if (!session) {
    const isRoot = window.location.pathname.endsWith("index.html") && !window.location.pathname.includes("/");
    // Redireciona para login
    window.location.href = isRoot ? "login/index.html" : "../login/index.html";
    return null;
  }
  return session;
}

/**
 * Preenche informações do usuário na sidebar.
 */
function fillSidebarUserInfo() {
  const session = getCurrentSession();
  if (!session) return;

  const nameEl = document.querySelector("[data-sidebar-user-name]");
  const roleEl = document.querySelector("[data-sidebar-user-role]");
  const avatarEl = document.querySelector("[data-sidebar-user-avatar]");

  if (nameEl) nameEl.textContent = session.nome || session.email;
  
  if (roleEl) {
      roleEl.textContent = session.perfil === "admin" ? "Administrador" : "Usuário";
  }
  
  if (avatarEl) {
    const nomeExibicao = session.nome || session.email || "U";
    avatarEl.textContent = nomeExibicao.substring(0, 2).toUpperCase();
  }

  // Aplica regras de visibilidade baseadas no perfil
  applyRoleBasedMenu(session);
}

/**
 * Esconde itens de menu exclusivos para admin se o usuário não for admin.
 */
function applyRoleBasedMenu(session) {
  const isUserAdmin = session && session.perfil === "admin";
  const adminOnlyItems = document.querySelectorAll("[data-admin-only]");
  
  adminOnlyItems.forEach((el) => {
    if (!isUserAdmin) {
      el.style.display = "none";
    } else {
      el.style.display = ""; // Restaura display original (block/flex/etc)
    }
  });
}

/**
 * Registra botão de logout.
 */
function registerLogoutButton() {
  const logoutBtn = document.querySelector("[data-action='logout']");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async function () {
    const btn = this;
    btn.disabled = true;
    btn.textContent = "Saindo...";
    await logout();
    window.location.href = "../login/index.html";
  });
}

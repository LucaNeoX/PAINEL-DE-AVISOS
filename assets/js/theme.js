/*
  Sistema de Controle de Documentos Ocupacionais
  Arquivo: assets/js/theme.js

  Objetivo:
  - Implementar o modo claro / modo escuro em todo o sistema.
  - Utilizar CSS Variables para trocar as cores automaticamente.
  - Persistir a escolha do usuário no LocalStorage.

  Conceito:
  - O <body> recebe uma das classes:
      * .dark-mode
      * .light-mode
  - O CSS (global.css / layout.css) usa apenas variáveis, como:
      * --color-bg-main
      * --color-text-main
      * --color-sidebar-bg
    e essas variáveis mudam de valor conforme a classe aplicada no body.
*/

const THEME_STORAGE_KEY = "scdo_theme"; // "light" ou "dark"

/**
 * Lê do LocalStorage qual foi o último tema escolhido.
 * - Retorna "light", "dark" ou null se ainda não houver preferência.
 */
function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (e) {
    console.error("Erro ao ler tema do LocalStorage:", e);
    return null;
  }
}

/**
 * Salva o tema atual no LocalStorage.
 */
function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.error("Erro ao salvar tema no LocalStorage:", e);
  }
}

/**
 * Aplica efetivamente o tema na página:
 * - Adiciona a classe .light-mode ou .dark-mode no <body>
 * - Atualiza o rótulo/ícone do botão toggle (se existir na página)
 */
function applyTheme(theme) {
  const body = document.body;
  const isLight = theme === "light";

  body.classList.remove("light-mode", "dark-mode");
  body.classList.add(isLight ? "light-mode" : "dark-mode");

  // Atualiza o estado visual do botão, quando existir.
  const toggleBtn = document.querySelector("[data-theme-toggle]");
  if (toggleBtn) {
    const iconEl = toggleBtn.querySelector("[data-theme-icon]");
    const labelEl = toggleBtn.querySelector("[data-theme-label]");

    if (iconEl && labelEl) {
      if (isLight) {
        // Modo claro ativo: mostramos ícone de lua sugerindo "ir para escuro"
        iconEl.textContent = "🌙";
        labelEl.textContent = "Modo escuro";
      } else {
        // Modo escuro ativo: mostramos ícone de sol sugerindo "ir para claro"
        iconEl.textContent = "☀️";
        labelEl.textContent = "Modo claro";
      }
    }
  }
}

/**
 * Alterna entre tema claro e escuro quando o usuário clica no toggle.
 * - Atualiza o <body>, atualiza o botão e salva a escolha no LocalStorage.
 */
function toggleTheme() {
  const current = document.body.classList.contains("light-mode")
    ? "light"
    : "dark";

  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
  saveTheme(next);
}

/**
 * Inicializa o comportamento do botão de tema.
 * - Detecta o tema salvo (ou usa "dark" como padrão).
 * - Aplica o tema ao carregar a página.
 * - Registra o evento de clique no botão.
 */
function initThemeToggle() {
  const saved = getSavedTheme();
  const initialTheme = saved === "light" || saved === "dark" ? saved : "dark";

  applyTheme(initialTheme);

  const toggleBtn = document.querySelector("[data-theme-toggle]");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      toggleTheme();
    });
  }
}

// Quando o DOM estiver carregado, configuramos o tema e o botão toggle.
document.addEventListener("DOMContentLoaded", function () {
  initThemeToggle();
});


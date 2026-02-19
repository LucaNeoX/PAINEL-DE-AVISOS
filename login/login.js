/*
  Tela de Login
  Arquivo: /login/login.js

  Responsável por:
  - Capturar o envio do formulário de login
  - Utilizar a função login(email, senha) do módulo auth.js
  - Exibir mensagens de erro/sucesso para o usuário
  - Redirecionar para o dashboard quando o login for válido
*/

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const feedbackEl = document.getElementById("login-feedback");

  // Se já existir sessão, pula direto para o dashboard.
  const existingSession = getCurrentSession();
  if (existingSession) {
    window.location.href = "../dashboard/index.html";
    return;
  }

  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    feedbackEl.textContent = "";

    const email = emailInput.value.trim();
    const senha = passwordInput.value.trim();

    if (!email || !senha) {
      feedbackEl.textContent = "Informe o e-mail e a senha.";
      return;
    }

    // Função login() vem do módulo auth.js
    const result = login(email, senha);

    if (!result.ok) {
      feedbackEl.textContent = result.message || "Falha ao autenticar.";
      return;
    }

    // Login bem-sucedido: direciona para o dashboard
    window.location.href = "../dashboard/index.html";
  });
});


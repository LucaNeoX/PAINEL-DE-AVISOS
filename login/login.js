document.addEventListener("DOMContentLoaded", function () {
  // Verifica se o cliente Supabase está carregado
  if (typeof supabase === "undefined") {
    console.error("Supabase não carregado! Verifique a conexão com a internet.");
  }

  const form = document.getElementById("login-form");
  const feedback = document.getElementById("login-feedback");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    feedback.textContent = "";
    feedback.classList.remove("success", "error");

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const btnSubmit = form.querySelector("button[type='submit']");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      feedback.textContent = "Por favor, preencha todos os campos.";
      feedback.classList.add("error");
      return;
    }

    // Feedback visual de carregamento
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Autenticando...";

    try {
      const result = await login(email, password);

      if (result.ok) {
        feedback.textContent = "Login realizado com sucesso! Redirecionando...";
        feedback.classList.add("success");
        
        // Pequeno delay para feedback visual
        setTimeout(() => {
          window.location.href = "../dashboard/index.html"; // Redireciona para o dashboard
        }, 1000);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Erro de login:", error);
      feedback.textContent = error.message || "Erro ao conectar com o servidor.";
      feedback.classList.add("error");
      
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Acessar sistema";
    }
  });
});

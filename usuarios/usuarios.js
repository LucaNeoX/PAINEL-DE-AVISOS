/*
  Gestão de Usuários
  Arquivo: /usuarios/usuarios.js

  NOVA ESTRATÉGIA:
  - Usa a função 'createTempClient' para criar um cliente Supabase isolado.
  - Isso permite que o Admin crie usuários sem perder sua sessão atual.
  - O Trigger 'on_auth_user_created' cuida da criação do perfil no banco.
*/

document.addEventListener("DOMContentLoaded", function () {
  const session = requireAuth();
  if (!session) return;

  fillSidebarUserInfo();
  registerLogoutButton();

  // Verifica se é admin
  if (session.perfil !== "admin") {
      document.getElementById("cadastro-usuario-card").style.display = "none";
      alert("Apenas administradores podem acessar esta página.");
      window.location.href = "../dashboard/index.html";
      return;
  }

  configurarFormulario();
  listarUsuarios();
});

/**
 * Cria um cliente temporário do Supabase que NÃO usa localStorage.
 * Isso impede que a criação do novo usuário sobrescreva a sessão do Admin atual.
 */
function createTempClient() {
    // Usamos SupabaseFactory (que é a lib original) para criar um novo cliente
    return window.SupabaseFactory.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false, // Não salvar sessão
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}

/**
 * Configura o envio do formulário.
 */
function configurarFormulario() {
    const form = document.getElementById("form-novo-usuario");
    const feedback = document.getElementById("feedback-usuario");
    const btn = document.getElementById("btn-criar-usuario");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        feedback.textContent = "";
        feedback.className = "feedback";
        btn.disabled = true;
        btn.textContent = "Criando...";

        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;
        const perfil = document.getElementById("perfil").value;

        if (senha.length < 6) {
            feedback.textContent = "A senha deve ter no mínimo 6 caracteres.";
            feedback.className = "feedback error";
            btn.disabled = false;
            btn.textContent = "Criar Usuário";
            return;
        }

        try {
            // 1. Cria cliente isolado
            const tempClient = createTempClient();

            // 2. Chama signUp (cria o usuário e dispara o Trigger no banco)
            const { data, error } = await tempClient.auth.signUp({
                email: email,
                password: senha,
                options: {
                    data: {
                        nome: nome,
                        perfil: perfil // O Trigger vai ler isso e criar o perfil
                    }
                }
            });

            if (error) throw error;

            // Se o usuário foi criado mas precisa de confirmação (configuração do Supabase)
            if (data.user && !data.session) {
                feedback.textContent = "Usuário criado! Se a confirmação de e-mail estiver ativada, ele precisará verificar a caixa de entrada.";
                feedback.className = "feedback warning";
            } else {
                feedback.textContent = "Usuário criado com sucesso!";
                feedback.className = "feedback success";
            }
            
            // Limpa form
            document.getElementById("nome").value = "";
            document.getElementById("email").value = "";
            document.getElementById("senha").value = "";
            
            // Espera um pouco para o Trigger rodar e recarrega lista
            setTimeout(listarUsuarios, 1000);

        } catch (err) {
            console.error("Erro ao criar usuário:", err);
            feedback.textContent = "Erro ao criar usuário: " + (err.message || "Erro desconhecido");
            feedback.className = "feedback error";
        } finally {
            btn.disabled = false;
            btn.textContent = "Criar Usuário";
        }
    });
}

/**
 * Lista os usuários cadastrados na tabela 'profiles'.
 */
async function listarUsuarios() {
    const tbody = document.getElementById("lista-usuarios");
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = "";

        if (!data || data.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Nenhum usuário encontrado.</td></tr>";
            return;
        }

        data.forEach(user => {
            const tr = document.createElement("tr");
            
            const dataCriacao = user.created_at ? formatDateToBR(user.created_at.split('T')[0]) : "-";

            tr.innerHTML = `
                <td>${user.nome || "Sem nome"}</td>
                <td>${user.email}</td>
                <td><span class="badge ${user.perfil === 'admin' ? 'badge-primary' : 'badge-secondary'}">${user.perfil}</span></td>
                <td>${dataCriacao}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Erro ao listar usuários:", err);
        tbody.innerHTML = "<tr><td colspan='4' class='text-center error'>Erro ao carregar usuários.</td></tr>";
    }
}

// CONFIGURAÇÃO DO SUPABASE
// ==============================================================================
// 1. Substitua estas strings pelas suas credenciais reais do Supabase
// (Disponível em Project Settings > API)
const SUPABASE_URL = "https://yhwkhvzrsnjbsqnfzfqp.supabase.co"; // Ex: https://abcdefghijklmno.supabase.co
const SUPABASE_ANON_KEY = "sb_publishable_mziXK-9VAOM3GaRR5__NuQ_H2J4q7F-"; // Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 2. Inicialização do cliente (usando a lib CDN incluída no HTML)
let supabaseClient = null;

if (typeof supabase !== 'undefined') {
  // SALVA A REFERÊNCIA DA BIBLIOTECA ORIGINAL (FACTORY)
  // Isso é crucial para podermos criar outros clientes (temp) depois
  window.SupabaseFactory = supabase;

  // Cria a instância principal usada no app
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("Supabase Client inicializado com sucesso.");
} else {
  console.error("ERRO CRÍTICO: Biblioteca Supabase não encontrada. Verifique se o script CDN está no HTML.");
}

// Exporta o cliente (instância) para ser usado em outros arquivos
// Mantemos 'window.supabase' como a instância conectada para compatibilidade com o resto do código
window.supabase = supabaseClient;

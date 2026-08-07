// Cole as credenciais publicas do seu projeto Supabase abaixo.
// A chave anon pode ficar no navegador; nunca coloque aqui uma service_role key.
const SUPABASE_URL = "https://ujdybixqxkbylbjcjjfk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qTlNLK2OHPQORRSz9MYwBQ_k3dw2F27";

const hasSupabaseConfig = !SUPABASE_URL.startsWith("COLE_AQUI")
  && !SUPABASE_ANON_KEY.startsWith("COLE_AQUI");

const supabaseClient = hasSupabaseConfig
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Disponivel para os demais scripts estaticos da aplicacao.
window.supabaseClient = supabaseClient;

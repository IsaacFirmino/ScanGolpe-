const SUPABASE_URL = "https://ujdybixqxkbylbjcjjfk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qTlNLK2OHPQORRSz9MYwBQ_k3dw2F27";

const hasSupabaseConfig = !SUPABASE_URL.includes("SEU_PROJETO")
  && !SUPABASE_ANON_KEY.includes("SUA_CHAVE");

const supabaseClient = hasSupabaseConfig
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

window.supabaseClient = supabaseClient;
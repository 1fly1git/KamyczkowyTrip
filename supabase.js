const SUPABASE_URL = "TU_WKLEJ_ADRES_PROJEKTU";
const SUPABASE_PUBLISHABLE_KEY = "TU_WKLEJ_PUBLISHABLE_KEY";

window.supabaseClient = null;

try {
  if (!window.supabase) {
    throw new Error("Biblioteka Supabase nie została załadowana.");
  }

  if (
    !SUPABASE_URL.startsWith("https://") ||
    SUPABASE_URL.includes("TU_WKLEJ")
  ) {
    throw new Error("Niepoprawny adres projektu Supabase.");
  }

  if (
    !SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_") ||
    SUPABASE_PUBLISHABLE_KEY.includes("TU_WKLEJ")
  ) {
    throw new Error("Niepoprawny publishable key.");
  }

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  console.log("Supabase został uruchomiony.");
} catch (error) {
  console.error("Błąd konfiguracji Supabase:", error);
}

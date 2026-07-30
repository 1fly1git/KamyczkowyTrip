const SUPABASE_URL =
  "https://wouqjbdjuhxysdocfxww.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "TU_WKLEJ_CAŁY_PUBLISHABLE_KEY";

try {
  if (!window.supabase) {
    throw new Error("Biblioteka Supabase nie została załadowana.");
  }

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  console.log("Supabase uruchomiony poprawnie.");
} catch (error) {
  window.supabaseClient = null;
  console.error("Błąd uruchamiania Supabase:", error);
}

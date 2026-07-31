function showAdminMessage(text) {
  const message = document.getElementById("adminMessage");

  if (!message) {
    return;
  }

  message.textContent = text;
  message.style.display = "block";
}

function showLoginPanel() {
  document.getElementById("loginPanel").style.display = "block";
  document.getElementById("moderationPanel").style.display = "none";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadPendingSightings() {
  
  const container =
    document.getElementById("pendingSightings");

  if (!container) {
    return;
  }

  container.textContent = "Ładuję zgłoszenia…";

  try {
    const { data, error } =
      await window.supabaseClient
        .from("sightings")
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: true
        });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      container.innerHTML =
        "<p>Brak oczekujących zgłoszeń ✅</p>";

      return;
    }

    container.innerHTML = data
      .map(function (finding) {
        const finderName =
          finding.finder_name ||
          "Anonimowy podróżnik";

        const placeName =
          finding.place_name ||
          "Nieznane miejsce";

        const stoneCode =
          finding.stone_code ||
          "Brak numeru";

        const findingDate =
          finding.finding_date
            ? new Date(
                finding.finding_date
              ).toLocaleDateString("pl-PL")
            : "Brak daty";

        const photo = finding.photo_url
          ? `
              <img
                src="${escapeHtml(finding.photo_url)}"
                alt="Zdjęcie kamyczka"
                loading="lazy"
                style="
                  width:100%;
                  max-width:320px;
                  display:block;
                  margin-top:12px;
                  border-radius:14px;
                "
              >
            `
          : "<p>Brak zdjęcia</p>";

        return `
          <article
            style="
              margin-top:18px;
              padding:16px;
              border:1px solid #ddd;
              border-radius:14px;
            "
          >
            <strong>
              🪨 ${escapeHtml(stoneCode)}
            </strong>

            <p>
              👤 ${escapeHtml(finderName)}
            </p>

            <p>
              📍 ${escapeHtml(placeName)}
            </p>

            <p>
              🗓️ ${escapeHtml(findingDate)}
            </p>

            ${photo}
          </article>
        `;
      })
      .join("");
  } catch (error) {
    console.error(
      "Błąd pobierania zgłoszeń:",
      error
    );

    container.innerHTML = `
      <p>
        Nie udało się pobrać zgłoszeń.
      </p>

      <p>
        ${escapeHtml(
          error.message || "Nieznany błąd"
        )}
      </p>
    `;
  }
}


function showModerationPanel(user) {
  document.getElementById("loginPanel").style.display = "none";
  document.getElementById("moderationPanel").style.display = "block";

  document.getElementById("loggedUser").textContent =
    user.email || "Moderator";
  loadPendingSightings();
}

async function loginModerator() {
  const email = document
    .getElementById("adminEmail")
    .value
    .trim();

  const password = document
    .getElementById("adminPassword")
    .value;

  if (!email || !password) {
    showAdminMessage("Podaj adres e-mail i hasło.");
    return;
  }

  showAdminMessage("Logowanie…");

  try {
    const { data, error } =
      await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      throw error;
    }

    showAdminMessage("Zalogowano pomyślnie ✅");
    showModerationPanel(data.user);
  } catch (error) {
    console.error("Błąd logowania:", error);

    showAdminMessage(
      "Nie udało się zalogować.\n\n" +
      (error.message || "Sprawdź e-mail i hasło.")
    );
  }
}

async function logoutModerator() {
  const { error } =
    await window.supabaseClient.auth.signOut();

  if (error) {
    showAdminMessage(
      "Nie udało się wylogować.\n\n" + error.message
    );
    return;
  }

  showAdminMessage("Wylogowano.");
  showLoginPanel();
}

async function checkModeratorSession() {
  if (!window.supabaseClient) {
    showAdminMessage("Brak połączenia z Supabase.");
    return;
  }

  const { data, error } =
    await window.supabaseClient.auth.getSession();

  if (error) {
    console.error("Błąd sprawdzania sesji:", error);
    showLoginPanel();
    return;
  }

  if (data.session && data.session.user) {
    showModerationPanel(data.session.user);
  } else {
    showLoginPanel();
  }
}

const loginButton =
  document.getElementById("loginButton");

const logoutButton =
  document.getElementById("logoutButton");

if (loginButton) {
  loginButton.addEventListener(
    "click",
    loginModerator
  );
}

if (logoutButton) {
  logoutButton.addEventListener(
    "click",
    logoutModerator
  );
}

checkModeratorSession();

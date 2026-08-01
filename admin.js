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
        .eq("moderation_status", "pending")
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
            <div
  style="
    margin-top:16px;
    display:flex;
    gap:10px;
  "
>
  <button
    onclick="approveFinding('${finding.id}')"
    class="button"
  >
    ✅ Zatwierdź
  </button>

  <button
    onclick="rejectFinding('${finding.id}')"
    class="button"
  >
    ❌ Odrzuć
  </button>
</div>
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
  loadPendingStones();
  loadPendingSightings();
}
async function approveFinding(id) {
  if (!confirm("Czy na pewno zatwierdzić to zgłoszenie?")) {
    return;
  }

  try {
    const { error } =
      await window.supabaseClient
        .from("sightings")
        .update({
          moderation_status: "approved"
        })
        .eq("id", id);

    if (error) {
      throw error;
    }

    showAdminMessage("✅ Zgłoszenie zostało zatwierdzone.");

    loadPendingSightings();
  } catch (error) {
    console.error(error);

    showAdminMessage(
      "Nie udało się zatwierdzić zgłoszenia.\n\n" +
      (error.message || "")
    );
  }
}


async function rejectFinding(id) {
  if (!confirm("Czy na pewno odrzucić to zgłoszenie?")) {
    return;
  }

  try {
    const { error } =
      await window.supabaseClient
        .from("sightings")
        .update({
          moderation_status: "rejected"
        })
        .eq("id", id);

    if (error) {
      throw error;
    }

    showAdminMessage("❌ Zgłoszenie zostało odrzucone.");

    loadPendingSightings();
  } catch (error) {
    console.error(error);

    showAdminMessage(
      "Nie udało się odrzucić zgłoszenia.\n\n" +
      (error.message || "")
    );
  }
}





function generateStoneCode() {
  const allowedCharacters =
    "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let index = 0; index < 5; index++) {
    const randomIndex = Math.floor(
      Math.random() * allowedCharacters.length
    );

    code += allowedCharacters[randomIndex];
  }

  return code;
}

async function generateUniqueStoneCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateStoneCode();

    const { data, error } = await window.supabaseClient
      .from("stones")
      .select("id")
      .eq("stone_code", code)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return code;
    }
  }

  throw new Error(
    "Nie udało się wygenerować wolnego kodu kamienia."
  );
}



async function createStonePassport() {
  const stonePhoto =
    document.getElementById("stonePhoto").files[0] || null;

  const stoneName =
    document.getElementById("stoneName").value.trim();

  const birthPlace =
    document.getElementById("birthPlace").value.trim();

  const birthDate =
    document.getElementById("birthDate").value;

  const country =
    document.getElementById("country").value.trim();

  const creatorName =
    document.getElementById("creatorName").value.trim();

  const story =
    document.getElementById("stoneDescription").value.trim();

  const createButton =
    document.getElementById("createStoneButton");

  if (!stoneName) {
    showAdminMessage("Podaj nazwę kamyszka.");
    return;
  }

  if (!birthPlace) {
    showAdminMessage("Podaj miejsce narodzin.");
    return;
  }

  if (!birthDate) {
    showAdminMessage("Wybierz datę narodzin.");
    return;
  }

  if (!country) {
    showAdminMessage("Podaj kraj.");
    return;
  }

  if (!stonePhoto) {
    showAdminMessage("Wybierz zdjęcie kamyszka.");
    return;
  }

  if (createButton) {
    createButton.disabled = true;
    createButton.textContent = "Tworzę paszport…";
  }

  showAdminMessage("Tworzę nowy paszport…");

  try {
    const stoneCode =
      await generateUniqueStoneCode();

    const formData = new FormData();

    formData.append("photo", stonePhoto);
    formData.append("stone_code", stoneCode);

    const uploadResponse = await fetch(
      "https://kamyczkowytrip.pl/upload.php",
      {
        method: "POST",
        body: formData
      }
    );

    const uploadResult =
      await uploadResponse.json();

    if (
      !uploadResponse.ok ||
      !uploadResult.success
    ) {
      throw new Error(
        uploadResult.message ||
        "Nie udało się wysłać zdjęcia."
      );
    }

    const { data: sessionData } =
      await window.supabaseClient.auth.getSession();

    const moderatorEmail =
      sessionData.session?.user?.email || null;

    const { error } =
      await window.supabaseClient
        .from("stones")
        .insert({
          stone_code: stoneCode,
          stone_name: stoneName,
          story: story || null,
          birth_date: birthDate,
          birth_place: birthPlace,
          country: country,
          creator_name: creatorName || null,
          photo_url: uploadResult.photo_url,
          thumbnail_url: uploadResult.thumbnail_url,
          color: null,
          created_by: moderatorEmail,
          status: true
        });

    if (error) {
      throw error;
    }

    showAdminMessage(
      "✅ Paszport został utworzony!\n\n" +
      "Nazwa: " + stoneName + "\n" +
      "Kod kamyszka: " + stoneCode
    );

    document.getElementById("stonePhoto").value = "";
    document.getElementById("stoneName").value = "";
    document.getElementById("birthPlace").value = "";
    document.getElementById("birthDate").value = "";
    document.getElementById("country").value = "";
    document.getElementById("creatorName").value = "";
    document.getElementById("stoneDescription").value = "";
  } catch (error) {
    console.error(
      "Błąd tworzenia paszportu:",
      error
    );

    showAdminMessage(
      "Nie udało się utworzyć paszportu.\n\n" +
      (error.message || "Nieznany błąd")
    );
  } finally {
    if (createButton) {
      createButton.disabled = false;
      createButton.textContent = "🪨 Utwórz paszport";
    }
  }
}

async function loadPendingStones() {
  const container =
    document.getElementById("pendingStones");

  if (!container) {
    return;
  }

  if (!window.supabaseClient) {
    container.textContent =
      "Brak połączenia z Supabase.";
    return;
  }

  container.textContent =
    "Ładuję zgłoszenia kamyczków...";

  try {
    const { data, error } =
      await window.supabaseClient
        .from("stones")
        .select(
          `
          id,
          stone_name,
          story,
          birth_date,
          birth_place,
          country,
          creator_name,
          submitter_email,
          photo_url,
          thumbnail_url,
          moderation_status,
          created_at
          `
        )
        .eq("moderation_status", "pending")
        .order("created_at", {
          ascending: true
        });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      container.innerHTML =
        "<p>Brak oczekujących zgłoszeń kamyczków.</p>";
      return;
    }

    container.innerHTML = data
      .map(function (stone) {
        const photoUrl =
          stone.thumbnail_url ||
          stone.photo_url ||
          "";

        const photo = photoUrl
          ? `
            <img
              src="${escapeHtml(photoUrl)}"
              alt="Zdjęcie kamyczka"
              loading="lazy"
              style="
                width:160px;
                height:120px;
                object-fit:cover;
                border-radius:12px;
                margin-top:12px;
              "
            >
          `
          : "<p>Brak zdjęcia</p>";

        return `
          <article
            class="pending-stone"
            style="
              padding:16px;
              margin:16px 0;
              border:1px solid #ddd;
              border-radius:14px;
            "
          >
            <h3>
              🪨 ${escapeHtml(stone.stone_name)}
            </h3>

            <p>
              <strong>Twórca:</strong>
              ${escapeHtml(stone.creator_name || "Nie podano")}
            </p>

            <p>
              <strong>E-mail:</strong>
              ${escapeHtml(stone.submitter_email || "Nie podano")}
            </p>

            <p>
              <strong>Miejsce narodzin:</strong>
              ${escapeHtml(stone.birth_place || "Nie podano")}
            </p>

            <p>
              <strong>Kraj:</strong>
              ${escapeHtml(stone.country || "Nie podano")}
            </p>

            <p>
              <strong>Data narodzin:</strong>
              ${escapeHtml(stone.birth_date || "Nie podano")}
            </p>

            <p>
              <strong>Opis:</strong><br>
              ${escapeHtml(stone.story || "Brak opisu")}
            </p>

            ${photo}

            <div style="margin-top:16px;">
              <button
                class="button"
                type="button"
                onclick="approveStone(${stone.id})"
              >
                ✅ Akceptuj
              </button>

              <button
                class="button"
                type="button"
                onclick="rejectStone(${stone.id})"
              >
                ❌ Odrzuć
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    console.error(
      "Błąd pobierania zgłoszeń kamyczków:",
      error
    );

    container.textContent =
      "Nie udało się pobrać zgłoszeń kamyczków.";
  }
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
const showStonesButton =
  document.getElementById("showStonesButton");
const createStoneButton =
    document.getElementById("createStoneButton");
const showSightingsButton =
  document.getElementById("showSightingsButton");

if (loginButton) {
  loginButton.addEventListener(
    "click",
    loginModerator
  );
}
if (showStonesButton) {
  showStonesButton.addEventListener(
    "click",
    showStonesPanel
  );
}
if (createStoneButton) {
    createStoneButton.addEventListener(
        "click",
        createStonePassport
    );
}
if (showSightingsButton) {
  showSightingsButton.addEventListener(
    "click",
    showSightingsPanel
  );
}
if (createStoneButton) {
  createStoneButton.addEventListener(
    "click",
    createStonePassport
  );
}
if (logoutButton) {
  logoutButton.addEventListener(
    "click",
    logoutModerator
  );
}
function showStonesPanel() {

  const stonesPanel =
    document.getElementById("stonesPanel");

  const sightingsPanel =
    document.getElementById("sightingsPanel");

  if (stonesPanel) {
    stonesPanel.style.display = "block";
  }

  if (sightingsPanel) {
    sightingsPanel.style.display = "none";
  }

}

function showSightingsPanel() {

  const stonesPanel =
    document.getElementById("stonesPanel");

  const sightingsPanel =
    document.getElementById("sightingsPanel");

  if (stonesPanel) {
    stonesPanel.style.display = "none";
  }

  if (sightingsPanel) {
    sightingsPanel.style.display = "block";
  }

}

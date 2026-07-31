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

function showModerationPanel(user) {
  document.getElementById("loginPanel").style.display = "none";
  document.getElementById("moderationPanel").style.display = "block";

  document.getElementById("loggedUser").textContent =
    user.email || "Moderator";
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

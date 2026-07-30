function showMessage(text) {
  const message = document.getElementById("message");

  if (!message) {
    alert(text);
    return;
  }

  message.textContent = text;
  message.style.display = "block";
}

async function testSupabaseConnection() {
  if (!window.supabaseClient) {
    showMessage(
      "Supabase nie został uruchomiony.\n\n" +
      "Sprawdź dane w pliku supabase.js."
    );
    return;
  }

  showMessage("Sprawdzam połączenie z bazą…");

  try {
    const { data, error } = await window.supabaseClient
      .from("stones")
      .select("*")
      .limit(1);

    if (error) {
      throw error;
    }

    console.log("Dane z tabeli stones:", data);

    showMessage(
      "Połączenie z Supabase działa ✅\n" +
      "Tabela stones jest dostępna."
    );
  } catch (error) {
    console.error("Błąd Supabase:", error);

    showMessage(
      "Połączenie z Supabase nie działa jeszcze.\n\n" +
      (error.message || "Nieznany błąd")
    );
  }
}

function getPlaceName(address) {
  return (
    address.tourism ||
    address.attraction ||
    address.amenity ||
    address.neighbourhood ||
    address.suburb ||
    address.village ||
    address.town ||
    address.city ||
    address.municipality ||
    address.county ||
    address.state ||
    "Nieznane miejsce"
  );
}

async function reverseGeocode(latitude, longitude) {
  const url =
    "https://nominatim.openstreetmap.org/reverse" +
    "?format=jsonv2" +
    "&lat=" + encodeURIComponent(latitude) +
    "&lon=" + encodeURIComponent(longitude) +
    "&accept-language=pl" +
    "&zoom=18" +
    "&addressdetails=1";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Nie udało się rozpoznać nazwy miejsca.");
  }

  return response.json();
}

function testLocation() {
  if (!navigator.geolocation) {
    showMessage("Ta przeglądarka nie obsługuje lokalizacji.");
    return;
  }

  showMessage("Pobieram lokalizację telefonu…");

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      showMessage("Lokalizacja pobrana. Rozpoznaję miejsce…");


      document.getElementById("findForm").style.display = "block";
document.getElementById("placeName").value = locationText;

      try {
        const locationData = await reverseGeocode(
          latitude,
          longitude
        );

        const address = locationData.address || {};
        const placeName = getPlaceName(address);

        const region =
          address.suburb ||
          address.neighbourhood ||
          address.county ||
          "";

        let locationText = placeName;

        if (region && region !== placeName) {
          locationText += ", " + region;
        }

        showMessage(
          "Znaleziono miejsce ✅\n" +
          locationText +
          "\n\nWspółrzędne: " +
          latitude.toFixed(5) +
          ", " +
          longitude.toFixed(5)
        );
      } catch (error) {
        console.error("Błąd rozpoznawania miejsca:", error);

        showMessage(
          "GPS działa, ale nie udało się rozpoznać miejsca.\n\n" +
          "Współrzędne: " +
          latitude.toFixed(5) +
          ", " +
          longitude.toFixed(5)
        );
      }
    },
    function (error) {
      if (error.code === 1) {
        showMessage(
          "Odmówiono dostępu do lokalizacji. Zezwól stronie na korzystanie z GPS."
        );
      } else if (error.code === 2) {
        showMessage(
          "Telefon nie może ustalić lokalizacji. Włącz GPS i spróbuj ponownie."
        );
      } else if (error.code === 3) {
        showMessage(
          "Pobieranie lokalizacji trwało zbyt długo. Spróbuj ponownie."
        );
      } else {
        showMessage("Nie udało się pobrać lokalizacji.");
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  );
}

async function saveFinding() {

  const nick =
    document.getElementById("finderName").value;

  const comment =
    document.getElementById("comment").value;

  const place =
    document.getElementById("placeName").value;

  showMessage(
`✅ Formularz działa!

Nick: ${nick || "Anonimowy podróżnik"}

Miejsce:
${place}

Komentarz:
${comment || "(brak)"}`);
}



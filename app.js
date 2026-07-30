
let currentLocation = {
  latitude: null,
  longitude: null,
  accuracy: null,
  placeName: ""
};



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

currentLocation.latitude = latitude;
currentLocation.longitude = longitude;
currentLocation.accuracy = position.coords.accuracy;
      

      showMessage("Lokalizacja pobrana. Rozpoznaję miejsce…");


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

document.getElementById("placeName").value = locationText;

currentLocation.placeName = locationText;
        
document.getElementById("findForm").style.display = "block";

showMessage(
  "Lokalizacja rozpoznana ✅\n" +
  locationText
);

        

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
  if (!window.supabaseClient) {
    showMessage("Brak połączenia z Supabase.");
    return;
  }

  if (
    currentLocation.latitude === null ||
    currentLocation.longitude === null
  ) {
    showMessage(
      "Najpierw pobierz lokalizację przyciskiem „Znalazłem Stefana”."
    );
    return;
  }

  const finderName = document
    .getElementById("finderName")
    .value
    .trim();

  const comment = document
    .getElementById("comment")
    .value
    .trim();

  const submitButton = document.getElementById("submitFinding");

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Zapisywanie…";
  }

  showMessage("Zapisuję zgłoszenie…");

  try {
    const { error } = await window.supabaseClient
      .from("sightings")
      .insert({
        stone_code: "KT-000001",
        finder_name: finderName || null,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        place_name: currentLocation.placeName,
        comment: comment || null,
        location_accuracy: currentLocation.accuracy,
        moderation_status: "pending"
      });

    if (error) {
      throw error;
    }

    showMessage(
      "❤️ Dziękujemy!\n\n" +
      "Zgłoszenie znalezienia Stefana zostało zapisane."
    );

    document.getElementById("finderName").value = "";
    document.getElementById("comment").value = "";
    document.getElementById("findForm").style.display = "none";

    loadTravelHistory();
  } catch (error) {
    console.error("Błąd zapisu zgłoszenia:", error);

    showMessage(
      "Nie udało się zapisać zgłoszenia.\n\n" +
      (error.message || "Nieznany błąd")
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "❤️ Wyślij zgłoszenie";
    }
  }
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatFindingDate(dateValue) {
  if (!dateValue) {
    return "Brak daty";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Brak daty";
  }

  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

async function loadTravelHistory() {
  const historyContainer =
    document.getElementById("travelHistory");

  if (!historyContainer) {
    return;
  }

  if (!window.supabaseClient) {
    historyContainer.textContent =
      "Nie udało się połączyć z bazą.";
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("sightings")
      .select(
        "finder_name, found_date, place_name, comment, moderation_status"
      )
      .eq("stone_code", "KT-000001")
      .eq("moderation_status", "approved")
      .order("found_date", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      historyContainer.innerHTML = `
        <div class="empty-history">
          Stefan nie ma jeszcze zatwierdzonych wpisów.
        </div>
      `;
      return;
    }

    historyContainer.innerHTML = data
      .map(function (finding) {
        const finderName =
          finding.finder_name || "Anonimowy podróżnik";

        const placeName =
          finding.place_name || "Nieznane miejsce";

        const comment = finding.comment
          ? `
            <div class="history-comment">
              „${escapeHtml(finding.comment)}”
            </div>
          `
          : "";

        return `
          <article class="history-entry">
            <div class="history-name">
              👤 ${escapeHtml(finderName)}
            </div>

            <div class="history-place">
              📍 ${escapeHtml(placeName)}
            </div>

            <div class="history-date">
              🗓️ ${formatFindingDate(finding.found_date)}
            </div>

            ${comment}
          </article>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Błąd pobierania historii:", error);

    historyContainer.textContent =
      "Nie udało się pobrać historii podróży.";
  }
}
async function loadStatistics() {
  const placesElement = document.getElementById("placesCount");
  const findersElement = document.getElementById("findersCount");

  if (!placesElement || !findersElement) {
    return;
  }

  if (!window.supabaseClient) {
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("sightings")
      .select("place_name, finder_name")
      .eq("stone_code", "KT-000001")
      .eq("moderation_status", "approved");

    if (error) {
      throw error;
    }

    const uniquePlaces = new Set(
      data
        .map(function (finding) {
          return finding.place_name;
        })
        .filter(Boolean)
    );

    const uniqueFinders = new Set(
      data
        .map(function (finding) {
          return finding.finder_name;
        })
        .filter(Boolean)
    );

    placesElement.textContent = uniquePlaces.size;
    findersElement.textContent = uniqueFinders.size;
  } catch (error) {
    console.error("Błąd pobierania statystyk:", error);
  }
}
loadTravelHistory();


async function loadStatistics() {
  const placesElement = document.getElementById("placesCount");
  const findersElement = document.getElementById("findersCount");

  if (!placesElement || !findersElement) {
    console.error("Nie znaleziono elementów statystyk.");
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("sightings")
      .select(
  "place_name, finder_name, latitude, longitude, found_date"
)
      .eq("stone_code", "KT-000001")
      .eq("moderation_status", "approved")
    .order("found_date", { ascending: true });

    if (error) {
      throw error;
    }

    console.log("Dane statystyk:", data);

    const places = new Set();
    const finders = new Set();
let totalDistance = 0;
    data.forEach(function (finding) {
      if (finding.place_name) {
        places.add(finding.place_name.trim().toLowerCase());
      }

      if (finding.finder_name) {
        finders.add(finding.finder_name.trim().toLowerCase());
      }
    });
for (let index = 1; index < data.length; index++) {
  const previousFinding = data[index - 1];
  const currentFinding = data[index];

  const previousLatitude =
    Number(previousFinding.latitude);

  const previousLongitude =
    Number(previousFinding.longitude);

  const currentLatitude =
    Number(currentFinding.latitude);

  const currentLongitude =
    Number(currentFinding.longitude);

  const coordinatesAreValid =
    Number.isFinite(previousLatitude) &&
    Number.isFinite(previousLongitude) &&
    Number.isFinite(currentLatitude) &&
    Number.isFinite(currentLongitude);

  if (coordinatesAreValid) {
    totalDistance += calculateDistanceKm(
      previousLatitude,
      previousLongitude,
      currentLatitude,
      currentLongitude
    );
  }
}
    placesElement.textContent = places.size;
    findersElement.textContent = finders.size;
document.getElementById("placesLabel").textContent =
  formatPlacesCount(places.size);

document.getElementById("findersLabel").textContent =
  formatFindersCount(finders.size);

    
  } catch (error) {
    console.error("Błąd statystyk:", error);

    placesElement.textContent = "0";
    findersElement.textContent = "0";
  }
}

loadTravelHistory();

function formatPlacesCount(count) {
  if (count === 1) {
    return "miejsce";
  }

  if (count >= 2 && count <= 4) {
    return "miejsca";
  }

  return "miejsc";
}

function formatFindersCount(count) {
  if (count === 1) {
    return "znalazca";
  }

  return "znalazców";
}
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;

  const latitudeDifference =
    (lat2 - lat1) * Math.PI / 180;

  const longitudeDifference =
    (lon2 - lon1) * Math.PI / 180;

  const firstLatitude = lat1 * Math.PI / 180;
  const secondLatitude = lat2 * Math.PI / 180;

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
    Math.cos(secondLatitude) *
    Math.sin(longitudeDifference / 2) ** 2;

  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );

  return earthRadiusKm * c;
}
loadStatistics();

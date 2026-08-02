
let currentLocation = {
  latitude: null,
  longitude: null,
  accuracy: null,
  placeName: ""
};
let currentStoneCode = "KT-000001";
let currentTravelMap = null;

let voterId = null;
let deviceFingerprint = null;

async function initializeVotingIdentity() {
  try {
    const fingerprintAgent =
      await FingerprintJS.load();

    const fingerprintResult =
      await fingerprintAgent.get();

    deviceFingerprint =
      fingerprintResult.visitorId;

    voterId = deviceFingerprint;
  } catch (error) {
    console.error(
      "Nie udało się utworzyć fingerprintu:",
      error
    );

    voterId =
      localStorage.getItem("voterId");

    if (!voterId) {
      voterId = crypto.randomUUID();

      localStorage.setItem(
        "voterId",
        voterId
      );
    }

    deviceFingerprint = voterId;
  }
}

initializeVotingIdentity();

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
          "Znaleziono miejsce ✅\n" +
          locationText
        );
      } catch (error) {
        console.error("Błąd rozpoznawania miejsca:", error);

        showMessage(
          "GPS działa, ale nie udało się rozpoznać miejsca."
          
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
      "Najpierw pobierz lokalizację przyciskiem „Znalazłem kamyczek”."
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
const editedPlaceName = document
  .getElementById("placeName")
  .value
  .trim();
  
  const photoFile = document
    .getElementById("findingPhoto")
    .files[0] || null;

  let photoUrl = null;
  let thumbnailUrl = null;

  const submitButton =
    document.getElementById("submitFinding");

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Zapisywanie…";
  }

  showMessage("Zapisuję zgłoszenie…");

  try {
    
    if (photoFile) {
      
      const formData = new FormData();

      formData.append("photo", photoFile);
      formData.append("stone_code", currentStoneCode);

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

      photoUrl = uploadResult.photo_url;
      thumbnailUrl = uploadResult.thumbnail_url;
    }

    const { error } = await window.supabaseClient
      .from("sightings")
      .insert({
        stone_code: currentStoneCode,
        finder_name: finderName || "Anonimowy podróżnik",
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        place_name: editedPlaceName || currentLocation.placeName,
        comment: comment || null,
        photo_url: photoUrl,
        thumbnail_url: thumbnailUrl,
        location_accuracy: currentLocation.accuracy,
        moderation_status: "pending"
      });

    if (error) {
      throw error;
    }

    showMessage(
      "❤️ Dziękujemy!\n\n" +
      "Zgłoszenie znalezienia kamyczka zostało zapisane."
    );

    document.getElementById("finderName").value = "";
    document.getElementById("comment").value = "";
    document.getElementById("findingPhoto").value = "";
    document.getElementById("findForm").style.display =
      "none";

    const photoPreview =
      document.getElementById("photoPreview");

    if (photoPreview) {
      photoPreview.src = "";
      photoPreview.style.display = "none";
    }

    loadTravelHistory();
    loadStatistics();
  } catch (error) {
    console.error(
      "Błąd zapisu zgłoszenia:",
      error
    );

    showMessage(
      "Nie udało się zapisać zgłoszenia.\n\n" +
      (error.message || "Nieznany błąd")
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent =
        "❤️ Wyślij zgłoszenie";
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
        "finder_name, found_date, place_name, comment, moderation_status, photo_url"
      )
      .eq("stone_code", currentStoneCode)
      .eq("moderation_status", "approved")
      .order("found_date", { ascending: false });

    if (error) {
      throw error;
    }

  if (!data || data.length === 0) {
  const stoneName =
    document.getElementById("passportStoneName")?.textContent ||
    "Ten kamyczek";

  historyContainer.innerHTML = `
    <div class="empty-history">
      ${escapeHtml(stoneName)} nie ma jeszcze zatwierdzonych wpisów.
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
        const photo =
  finding.photo_url
    ? `
        <div class="history-photo">
          <a
            href="${escapeHtml(finding.photo_url)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="${escapeHtml(finding.photo_url)}"
              alt="Zdjęcie kamyczka"
              loading="lazy"
              style="
                width:140px;
                height:105px;
                object-fit:cover;
                display:block;
                margin-top:12px;
                border-radius:12px;
                cursor:pointer;
              "
            >
          </a>
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
            ${photo}
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

async function loadStatistics() {
  const placesElement =
    document.getElementById("placesCount");

  const findersElement =
    document.getElementById("findersCount");

  const distanceElement =
    document.getElementById("distanceCount");
  const photosElement =
  document.getElementById("photosCount");

  const placesLabel =
    document.getElementById("placesLabel");

  const findersLabel =
    document.getElementById("findersLabel");

  if (!placesElement || !findersElement) {
    console.error("Nie znaleziono elementów statystyk.");
    return;
  }

  if (!window.supabaseClient) {
    console.error("Supabase nie został uruchomiony.");
    return;
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("sightings")
      .select(
  "place_name, finder_name, latitude, longitude, found_date, photo_url"
)
      .eq("stone_code", currentStoneCode)
      .eq("moderation_status", "approved")
      .order("found_date", { ascending: true });

    if (error) {
      throw error;
    }

    const places = new Set();
    const finders = new Set();
let photosCount = 0;
    data.forEach(function (finding) {
      if (finding.photo_url) {
  photosCount++;
      }
      if (finding.place_name) {
        places.add(
          finding.place_name.trim().toLowerCase()
        );
      }

      if (finding.finder_name) {
        finders.add(
          finding.finder_name.trim().toLowerCase()
        );
      }
    });

    let totalDistance = 0;

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
if (photosElement) {
  photosElement.textContent = photosCount;
}
    if (distanceElement) {
      distanceElement.textContent =
        Math.round(totalDistance) + " km";
    }

    if (placesLabel) {
      placesLabel.textContent =
        formatPlacesCount(places.size);
    }

    if (findersLabel) {
      findersLabel.textContent =
        formatFindersCount(finders.size);
    }
  } catch (error) {
    console.error("Błąd pobierania statystyk:", error);

    placesElement.textContent = "0";
    findersElement.textContent = "0";

    if (distanceElement) {
      distanceElement.textContent = "0 km";
    }
  }
}
async function loadTravelMap() {

  const mapElement = document.getElementById("travelMap");

  if (!mapElement || !window.supabaseClient || !window.L) {
    return;
  }

  const { data, error } = await window.supabaseClient
    .from("sightings")
    .select(
  "latitude, longitude, place_name, found_date, photo_url"
)
    .eq("stone_code", currentStoneCode)
    .eq("moderation_status", "approved")
    .order("found_date", { ascending: true });

if (error || !data || data.length === 0) {
    if (currentTravelMap) {
        currentTravelMap.remove();
        currentTravelMap = null;
    }

    mapElement.innerHTML =
        "<p>Ten kamyczek nie ma jeszcze zatwierdzonych punktów na mapie.</p>";

    return;
}

if (currentTravelMap) {
    currentTravelMap.remove();
    currentTravelMap = null;
}

mapElement.innerHTML = "";

currentTravelMap = L.map("travelMap");
const map = currentTravelMap;

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap"
    }
  ).addTo(map);

  const points = [];

data.forEach(function (finding, index) {
  const lat = Number(finding.latitude);
  const lng = Number(finding.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  points.push([lat, lng]);

  const stageNumber = index + 1;

  const safePhotoUrl = finding.photo_url
  ? escapeHtml(finding.photo_url)
  : "";

const markerContent = safePhotoUrl
  ? `
      <div class="travel-photo-marker">
        <img
          src="${safePhotoUrl}"
          alt="Etap ${stageNumber}"
        >
        <span>${stageNumber}</span>
      </div>
    `
  : `
      <div class="travel-number-marker">
        ${stageNumber}
      </div>
    `;

const stageIcon = L.divIcon({
  className: "travel-stage-icon",
  html: markerContent,
  iconSize: safePhotoUrl ? [58, 58] : [34, 34],
  iconAnchor: safePhotoUrl ? [29, 29] : [17, 17],
  popupAnchor: safePhotoUrl ? [0, -30] : [0, -18]
});

  const placeName =
    finding.place_name || "Nieznane miejsce";

  const findingDate =
    formatFindingDate(finding.found_date);
  const popupPhoto =
  finding.photo_url
    ? `
        <div class="history-photo">
          <a
            href="${escapeHtml(finding.photo_url)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="${escapeHtml(finding.photo_url)}"
              alt="Zdjęcie kamyczka Stefan"
              loading="lazy"
              style="
                width:140px;
                height:105px;
                object-fit:cover;
                display:block;
                margin-top:12px;
                border-radius:12px;
                cursor:pointer;
              "
            >
          </a>
        </div>
      `
    : "";

  L.marker([lat, lng], {
    icon: stageIcon
  })
    .addTo(map)
    .bindPopup(`
  <strong>Etap ${stageNumber}</strong><br>
  📍 ${escapeHtml(placeName)}<br>
  🗓️ ${findingDate}
  ${popupPhoto}
`);
});





  

  L.polyline(points, {
    color: "#2e8b57",
    weight: 4
  }).addTo(map);

  map.fitBounds(points, {
    padding: [30, 30]
  });

}


const photoInput =
  document.getElementById("findingPhoto");

const photoPreview =
  document.getElementById("photoPreview");

if (photoInput && photoPreview) {

  photoInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) {
      photoPreview.style.display = "none";
      return;
    }

    photoPreview.src =
      URL.createObjectURL(file);

    photoPreview.style.display = "block";

  });

}

const searchButton =
  document.getElementById("searchStoneButton");

if (searchButton) {
  searchButton.addEventListener("click", async function () {
    const code = document
      .getElementById("stoneSearchCode")
      .value
      .trim()
      .toUpperCase();

    const message =
      document.getElementById("stoneSearchMessage");

    if (!code) {
      message.style.display = "block";
      message.textContent = "Wpisz kod kamyczka.";
      return;
    }

    message.style.display = "block";
    message.textContent = "🔍 Szukam paszportu kamyczka...";

    try {
      const { data, error } =
        await window.supabaseClient
          .from("stones")
          .select("*")
          .eq("stone_code", code)
          .eq("status", true)
          .eq("moderation_status", "approved")
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        message.textContent =
          "Nie znaleziono aktywnego paszportu o takim kodzie.";
        return;
      }

      message.textContent =
        "✅ Znaleziono paszport: " + data.stone_name;
      document.getElementById("stonePassportCard").style.display = "block";
document.getElementById("travelMapSection").style.display = "block";
document.getElementById("travelBookSection").style.display = "block";

      document.getElementById("passportStoneName").textContent =
    data.stone_name || "Bez nazwy";
      document.getElementById("historyStoneName").textContent =
    data.stone_name || "kamyczka";
      
document.getElementById("mapStoneName").textContent =
  data.stone_name || "kamyczka";
document.getElementById("passportStoneCode").textContent =
    data.stone_code || "";
      document.getElementById("passportOwnerName").textContent =
    data.creator_name || "Nieznany";

document.getElementById("passportStoneStory").textContent =
    data.story || "Ten kamyczek nie ma jeszcze historii.";

document.getElementById("foundStoneName").textContent =
    data.stone_name || "kamyczek";
      const ratingInfo =
  document.getElementById("stoneRatingInfo");

if (ratingInfo) {
  const average =
    Number(data.rating_average || 0);

  const count =
    Number(data.rating_count || 0);

if (count === 0) {
  ratingInfo.textContent = "Brak ocen";
} else {
  const roundedAverage = Math.round(average);

  let averageStars = "";

  for (let index = 1; index <= 5; index++) {
    averageStars +=
      index <= roundedAverage ? "★" : "☆";
  }

  ratingInfo.innerHTML = `
    <div class="average-stars">
      ${averageStars}
    </div>

    <div>
      Średnia: ${average.toFixed(2)} / 5 (${count} ocen)
    </div>
  `;
}
  
}
      currentStoneCode = data.stone_code;
      loadMyStoneRating();
      loadTravelHistory();
loadStatistics();
loadTravelMap();

if (data.photo_url) {
    document.getElementById("passportStonePhoto").innerHTML =
        `<img src="${data.photo_url}" style="width:140px;height:140px;border-radius:50%;object-fit:cover;">`;
} else {
    document.getElementById("passportStonePhoto").textContent = "🪨";
}

      console.log("Znaleziony kamyczek:", data);
    } catch (error) {
      console.error("Błąd wyszukiwania paszportu:", error);

      message.textContent =
        "Nie udało się wyszukać paszportu. " +
        (error.message || "");
    }
  });
}


async function submitNewStone() {
  const stoneName =
    document.getElementById("newStoneName").value.trim();

  const creatorName =
    document.getElementById("newCreatorName").value.trim();

  const submitterEmail =
    document.getElementById("newSubmitterEmail").value.trim();

  const birthPlace =
    document.getElementById("newBirthPlace").value.trim();

  const country =
    document.getElementById("newCountry").value.trim();

  const birthDate =
    document.getElementById("newBirthDate").value;

  const story =
    document.getElementById("newStoneStory").value.trim();

  const stonePhoto =
    document.getElementById("newStonePhoto").files[0] || null;

  const message =
    document.getElementById("submitStoneMessage");

  const submitButton =
    document.getElementById("submitStoneButton");

  function showSubmitMessage(text) {
    if (!message) {
      alert(text);
      return;
    }

    message.textContent = text;
    message.style.display = "block";
  }

  if (!stoneName) {
    showSubmitMessage("Podaj nazwę kamyczka.");
    return;
  }

  if (!creatorName) {
    showSubmitMessage("Podaj imię lub nick twórcy.");
    return;
  }

  if (!submitterEmail) {
    showSubmitMessage("Podaj adres e-mail.");
    return;
  }

  if (!submitterEmail.includes("@")) {
    showSubmitMessage("Podaj poprawny adres e-mail.");
    return;
  }

  if (!birthPlace) {
    showSubmitMessage("Podaj miejsce narodzin.");
    return;
  }

  if (!country) {
    showSubmitMessage("Podaj kraj.");
    return;
  }

  if (!birthDate) {
    showSubmitMessage("Wybierz datę narodzin.");
    return;
  }

  if (!stonePhoto) {
    showSubmitMessage("Dodaj zdjęcie kamyczka.");
    return;
  }

  if (!window.supabaseClient) {
    showSubmitMessage("Brak połączenia z bazą danych.");
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Wysyłanie…";
  }

  showSubmitMessage("Wysyłam zgłoszenie…");

  try {
    const temporaryUploadCode =
      "pending_" + Date.now();

    const formData = new FormData();

    formData.append("photo", stonePhoto);
    formData.append("stone_code", temporaryUploadCode);

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

    const { error } =
      await window.supabaseClient
        .from("stones")
        .insert({
          stone_code: null,
          stone_name: stoneName,
          story: story || null,
          birth_date: birthDate,
          birth_place: birthPlace,
          country: country,
          creator_name: creatorName,
          submitter_email: submitterEmail,
          photo_url: uploadResult.photo_url,
          thumbnail_url: uploadResult.thumbnail_url,
          moderation_status: "pending",
          status: false
        });

    if (error) {
      throw error;
    }

    showSubmitMessage(
      "✅ Zgłoszenie zostało wysłane.\n" +
      "Po zaakceptowaniu otrzymasz kod kamyczka na podany adres e-mail."
    );

    document.getElementById("newStoneName").value = "";
    document.getElementById("newCreatorName").value = "";
    document.getElementById("newSubmitterEmail").value = "";
    document.getElementById("newBirthPlace").value = "";
    document.getElementById("newCountry").value = "";
    document.getElementById("newBirthDate").value = "";
    document.getElementById("newStoneStory").value = "";
    document.getElementById("newStonePhoto").value = "";
  } catch (error) {
    console.error("Błąd zgłoszenia kamyczka:", error);

    showSubmitMessage(
      "Nie udało się wysłać zgłoszenia.\n" +
      (error.message || "Nieznany błąd")
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "❤️ Wyślij do akceptacji";
    }
  }
}


document
  .getElementById("submitStoneButton")
  ?.addEventListener("click", submitNewStone);


const toggleStoneFormButton =
  document.getElementById("toggleStoneFormButton");

const newStoneFormContainer =
  document.getElementById("newStoneFormContainer");

if (toggleStoneFormButton && newStoneFormContainer) {
  toggleStoneFormButton.addEventListener("click", function () {
    const isHidden =
      newStoneFormContainer.style.display === "none";

    newStoneFormContainer.style.display =
      isHidden ? "block" : "none";

    toggleStoneFormButton.textContent =
      isHidden
        ? "➖ Ukryj formularz"
        : "➕ Zgłoś nowy kamyczek";
  });
}

async function loadRanking() {
  const ranking = document.getElementById("rankingList");

  if (!ranking || !window.supabaseClient) {
    return;
  }

  ranking.innerHTML = "Ładowanie rankingu...";

  const { data, error } = await window.supabaseClient
    .from("stones")
    .select(`
      stone_name,
      stone_code,
      thumbnail_url,
      total_distance,
      places_count,
      finders_count,
      photos_count
    `)
    .eq("status", true)
    .eq("moderation_status", "approved")
    .order("total_distance", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Błąd rankingu:", error);
    ranking.innerHTML = "Nie udało się pobrać rankingu.";
    return;
  }

  if (!data || data.length === 0) {
    ranking.innerHTML = "Brak danych w rankingu.";
    return;
  }

  ranking.innerHTML = data
    .map(function (stone, index) {
      const medals = ["🥇", "🥈", "🥉"];
      const position = medals[index] || `${index + 1}.`;

      return `
        <button
          type="button"
          class="ranking-item"
          data-stone-code="${escapeHtml(stone.stone_code || "")}"
        >
        <div class="ranking-photo">
  ${
    stone.thumbnail_url
      ? `
        <img
          src="${escapeHtml(stone.thumbnail_url)}"
          alt="Miniatura kamyczka"
          loading="lazy"
        >
      `
      : `<span>🪨</span>`
  }
</div>
          <div class="ranking-position">
            ${position}
          </div>

          <div class="ranking-content">
            <div class="ranking-name">
              ${escapeHtml(stone.stone_name || "Bez nazwy")}
            </div>

            <div class="ranking-code">
              ${escapeHtml(stone.stone_code || "")}
            </div>

            <div class="ranking-stats">
              <span>📏 ${stone.total_distance || 0} km</span>
              <span>📍 ${stone.places_count || 0}</span>
              <span>👣 ${stone.finders_count || 0}</span>
              <span>📷 ${stone.photos_count || 0}</span>
            </div>
          </div>

          <div class="ranking-arrow">
            ›
          </div>
        </button>
      `;
    })
    .join("");

  ranking
    .querySelectorAll(".ranking-item")
    .forEach(function (item) {
      item.addEventListener("click", function () {
        const stoneCode = item.dataset.stoneCode;

        if (!stoneCode) {
          return;
        }

        const searchInput =
          document.getElementById("stoneSearchCode");

        const searchButton =
          document.getElementById("searchStoneButton");

        if (searchInput) {
          searchInput.value = stoneCode;
        }

        if (searchButton) {
          searchButton.click();
        }

        setTimeout(function () {
  const passportCard =
    document.getElementById("stonePassportCard");

  if (passportCard) {
    passportCard.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}, 500);
      });
    });
}
async function loadBeautyRanking() {
  const ranking =
    document.getElementById("rankingList");

  if (!ranking || !window.supabaseClient) {
    return;
  }

  ranking.innerHTML =
    "Ładowanie rankingu wyglądu...";

  const { data, error } =
    await window.supabaseClient
      .from("stones")
      .select(`
        stone_name,
        stone_code,
        thumbnail_url,
        rating_average,
        rating_count
      `)
      .eq("status", true)
      .eq("moderation_status", "approved")
      .gte("rating_count", 3)
      .order("rating_average", {
        ascending: false
      })
      .order("rating_count", {
        ascending: false
      })
      .limit(10);

  if (error) {
    console.error(
      "Błąd rankingu wyglądu:",
      error
    );

    ranking.innerHTML =
      "Nie udało się pobrać rankingu wyglądu.";

    return;
  }

  if (!data || data.length === 0) {
    ranking.innerHTML =
      "Żaden kamyczek nie ma jeszcze minimum 3 ocen.";

    return;
  }

  ranking.innerHTML = data
    .map(function (stone, index) {
      const medals = ["🥇", "🥈", "🥉"];

      const position =
        medals[index] || `${index + 1}.`;

      const average =
        Number(stone.rating_average || 0);

      const count =
        Number(stone.rating_count || 0);

      return `
        <button
          type="button"
          class="ranking-item"
          data-stone-code="${escapeHtml(
            stone.stone_code || ""
          )}"
        >
          <div class="ranking-photo">
            ${
              stone.thumbnail_url
                ? `
                  <img
                    src="${escapeHtml(
                      stone.thumbnail_url
                    )}"
                    alt="Miniatura kamyczka"
                    loading="lazy"
                  >
                `
                : `<span>🪨</span>`
            }
          </div>

          <div class="ranking-position">
            ${position}
          </div>

          <div class="ranking-content">
            <div class="ranking-name">
              ${escapeHtml(
                stone.stone_name || "Bez nazwy"
              )}
            </div>

            <div class="ranking-code">
              ${escapeHtml(
                stone.stone_code || ""
              )}
            </div>

            <div class="ranking-stats">
              <span>
                ⭐ ${average.toFixed(2)} / 5
              </span>

              <span>
                🗳️ ${
count === 1
    ? "1 ocena"
    : count >= 2 && count <= 4
    ? `${count} oceny`
    : `${count} ocen`
                }
              </span>
            </div>
          </div>

          <div class="ranking-arrow">
            ›
          </div>
        </button>
      `;
    })
    .join("");

  ranking
    .querySelectorAll(".ranking-item")
    .forEach(function (item) {
      item.addEventListener(
        "click",
        function () {
          const stoneCode =
            item.dataset.stoneCode;

          if (!stoneCode) {
            return;
          }

          const searchInput =
            document.getElementById(
              "stoneSearchCode"
            );

          const searchButton =
            document.getElementById(
              "searchStoneButton"
            );

          if (searchInput) {
            searchInput.value = stoneCode;
          }

          if (searchButton) {
            searchButton.click();
          }

          setTimeout(function () {
            const passportCard =
              document.getElementById(
                "stonePassportCard"
              );

            if (passportCard) {
              passportCard.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }
          }, 500);
        }
      );
    });
}
async function saveStoneRating(rating) {

  if (!window.supabaseClient) {
    return;
  }
  if (!deviceFingerprint) {
  alert("Identyfikator głosowania jeszcze się ładuje. Spróbuj ponownie za chwilę.");
  return;
  }

  const { data: existingRating } =
    await window.supabaseClient
      .from("stone_ratings")
      .select("id")
.eq("stone_code", currentStoneCode)
.eq("device_fingerprint", deviceFingerprint)
.maybeSingle();

  if (existingRating) {

    await window.supabaseClient
      .from("stone_ratings")
      .update({
        rating: rating
      })
      .eq("id", existingRating.id);

  } else {

    await window.supabaseClient
      .from("stone_ratings")
    .insert({
    stone_code: currentStoneCode,
    rating: rating,
    voter_id: voterId,
    device_fingerprint: deviceFingerprint
});

  }

}

setTimeout(function () {
  loadRanking();
}, 500);

async function loadMyStoneRating() {
  const ratingStars =
    document.querySelectorAll(
      "#stoneRatingStars span"
    );

  ratingStars.forEach(function (star) {
    star.classList.remove("active");
  });

  if (
    !window.supabaseClient ||
    !currentStoneCode ||
    !voterId
  ) {
    return;
  }

  const { data, error } =
    await window.supabaseClient
      .from("stone_ratings")
      .select("rating")
.eq("stone_code", currentStoneCode)
.eq("device_fingerprint", deviceFingerprint)
.maybeSingle();

  if (error) {
    console.error(
      "Błąd pobierania własnej oceny:",
      error
    );
    return;
  }

  if (!data) {
    return;
  }

  const savedRating = Number(data.rating);

ratingStars.forEach(function (star) {
  const starValue = Number(star.dataset.rating);

  if (starValue <= savedRating) {
    star.classList.add("active");
    star.textContent = "★";
  } else {
    star.classList.remove("active");
    star.textContent = "☆";
  }
});
}
const ratingStars =
  document.querySelectorAll(
    "#stoneRatingStars span"
  );

ratingStars.forEach(function (star) {

  star.addEventListener("click", async function () {

    const rating =
      Number(this.dataset.rating);

    await saveStoneRating(rating);

    ratingStars.forEach(function (item) {
  const starValue = Number(item.dataset.rating);

  if (starValue <= rating) {
    item.classList.add("active");
    item.textContent = "★";
  } else {
    item.classList.remove("active");
    item.textContent = "☆";
  }
});

  });

});

const travelRankingButton =
  document.getElementById("travelRankingButton");

const ratingRankingButton =
  document.getElementById("ratingRankingButton");

if (travelRankingButton) {
  travelRankingButton.addEventListener(
    "click",
    function () {
      travelRankingButton.classList.add("active");

      ratingRankingButton?.classList.remove("active");

      loadRanking();
    }
  );
}

if (ratingRankingButton) {
  ratingRankingButton.addEventListener(
    "click",
    function () {
      ratingRankingButton.classList.add("active");

      travelRankingButton?.classList.remove("active");

      loadBeautyRanking();
    }
  );
}
async function loadStoneGallery() {
  const galleryList =
    document.getElementById("galleryList");

  if (!galleryList) {
    return;
  }

  if (!window.supabaseClient) {
    galleryList.innerHTML =
      "Brak połączenia z Supabase.";
    return;
  }

  galleryList.innerHTML =
    "Ładowanie galerii...";

  const { data, error } =
    await window.supabaseClient
      .from("stones")
      .select(`
        stone_name,
        stone_code,
        creator_name,
        thumbnail_url,
        rating_average,
        rating_count,
        total_distance,
        places_count
      `)
      .eq("status", true)
      .eq("moderation_status", "approved")
      .order("created_at", {
  ascending: false
})
      .limit(12);

  if (error) {
    console.error(
      "Błąd pobierania galerii:",
      error
    );

    galleryList.innerHTML =
      "Nie udało się pobrać galerii.";

    return;
  }

  if (!data || data.length === 0) {
    galleryList.innerHTML =
      "Brak kamyczków w galerii.";

    return;
  }

  galleryList.innerHTML = data
    .map(function (stone) {
      const average =
        Number(stone.rating_average || 0);

      const count =
        Number(stone.rating_count || 0);

      return `
        <button
          type="button"
          class="gallery-item"
          data-stone-code="${escapeHtml(
            stone.stone_code || ""
          )}"
        >
          <div class="gallery-photo">
            ${
              stone.thumbnail_url
                ? `
                  <img
                    src="${escapeHtml(
                      stone.thumbnail_url
                    )}"
                    alt="Zdjęcie kamyczka"
                    loading="lazy"
                  >
                `
                : `<span>🪨</span>`
            }
          </div>

          <div class="gallery-content">
            <div class="gallery-name">
              ${escapeHtml(
                stone.stone_name || "Bez nazwy"
              )}
            </div>

            <div class="gallery-author">
              Autor:
              ${escapeHtml(
                stone.creator_name || "Nieznany"
              )}
            </div>

            <div class="gallery-rating">
  ⭐ ${average.toFixed(2)}
  (${
    count === 1
      ? "1 ocena"
      : count >= 2 && count <= 4
      ? `${count} oceny`
      : `${count} ocen`
  })
</div>

          <div class="gallery-stats">
    <span>📏 ${stone.total_distance || 0} km</span>
    <span>📍 ${stone.places_count || 0} miejsc</span>
</div>
          </div>
        </button>
      `;
    })
    .join("");

  galleryList
    .querySelectorAll(".gallery-item")
    .forEach(function (item) {
      item.addEventListener(
        "click",
        function () {
          const stoneCode =
            item.dataset.stoneCode;

          if (!stoneCode) {
            return;
          }

          const searchInput =
            document.getElementById(
              "stoneSearchCode"
            );

          const searchButton =
            document.getElementById(
              "searchStoneButton"
            );

          if (searchInput) {
            searchInput.value = stoneCode;
          }

          if (searchButton) {
  const backButton =
    document.getElementById("backToGalleryButton");

  const stoneGallery =
    document.getElementById("stoneGallery");

  if (backButton) {
    backButton.style.display = "inline-block";
  }

  if (stoneGallery) {
    stoneGallery.style.display = "none";
  }

  searchButton.click();
          }

          setTimeout(function () {
            const passportCard =
              document.getElementById(
                "stonePassportCard"
              );

            if (passportCard) {
              passportCard.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }
          }, 500);
        }
      );
    });
}
loadStoneGallery();
window.addEventListener("load", function () {
  const backToGalleryButton =
    document.getElementById("backToGalleryButton");

  if (!backToGalleryButton) {
    return;
  }

  backToGalleryButton.addEventListener(
    "click",
    function () {
      const gallery =
        document.getElementById("stoneGallery");

      const passport =
        document.getElementById("stonePassportCard");

      if (gallery) {
        gallery.style.display = "block";
      }

      if (passport) {
        passport.style.display = "none";
      }

      backToGalleryButton.style.display = "none";

      setTimeout(function () {
        if (gallery) {
          gallery.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 100);
    }
  );
});

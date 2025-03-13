async function getTramTimes() {
  try {
    const response = await fetch(
      "https://data.mobilites-m.fr/api/routers/default/index/stops/SEM:3207/stoptimes?route=SEM%3AE&showCancelledTrips=false",
      {
        method: "GET",
        headers: {
          Origin: "mon_appli",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }

    const data = await response.json();
    console.log("Données récupérées :", data); // Vérifier les données

    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération des données:", error);
    return null;
  }
}

async function calculateTramTime() {
  const data = await getTramTimes();
  if (
    !data ||
    data.length === 0 ||
    !data[0].times ||
    data[0].times.length === 0
  ) {
    document.getElementById("tram-time").textContent =
      "Aucune donnée disponible.";
    return;
  }

  const now = Math.floor(Date.now() / 1000); // Temps actuel en secondes UNIX
  const nextTram = data[0].times[0]; // Prend le premier horaire

  // ✅ Correction : Convertir en timestamp absolu
  const nextTramTime = nextTram.serviceDay + nextTram.realtimeArrival;

  const diff = nextTramTime - now;
  if (diff < 0) {
    document.getElementById("tram-time").textContent = "Aucun tram à venir.";
    return;
  }

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  document.getElementById(
    "tram-time"
  ).textContent = `Le prochain tram est dans ${hours}h ${minutes}m ${seconds}s`;
}

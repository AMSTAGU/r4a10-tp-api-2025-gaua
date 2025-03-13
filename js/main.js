import { Search } from "./modelSearch.js";
import { view } from "./view.js";
import { CountDown } from "./modelCountdown.js";

// Désactive les sélections au départ
view.selectionArretDepart.disabled = true;
view.selectionArretArrivee.disabled = true;

let arretsData = []; // Stocke les arrêts récupérés pour la ligne sélectionnée

// Écouteur d'événement sur la sélection de la ligne
view.selectionLigne.addEventListener("change", async () => {
  const ligneSelectionnee = view.selectionLigne.value;
  if (!ligneSelectionnee) return;

  // Désactive les sélections pendant le chargement
  view.selectionArretDepart.disabled = true;
  view.selectionArretArrivee.disabled = true;

  try {
    // Appel API pour récupérer les arrêts de la ligne
    const response = await fetch(
      `https://data.mobilites-m.fr/api/ficheHoraires/json?route=${ligneSelectionnee}`
    );
    const data = await response.json();

    // On prend les arrêts de la première direction trouvée
    arretsData =
      Object.values(data).find((direction) => direction?.arrets?.length)
        ?.arrets || [];

    if (arretsData.length === 0) {
      throw new Error("Aucun arrêt trouvé pour cette ligne.");
    }

    // Remplissage de la sélection "ArretDepart"
    view.selectionArretDepart.innerHTML =
      '<option value="">Sélectionner un arrêt de départ</option>';
    arretsData.forEach((arret) => {
      const option = document.createElement("option");
      option.value = arret.parentStation.code;
      option.textContent = arret.name;
      view.selectionArretDepart.appendChild(option);
    });

    // Active la sélection des arrêts de départ
    view.selectionArretDepart.disabled = false;
  } catch (error) {
    console.error("Erreur lors de la récupération des arrêts :", error);
  }
});

// Écouteur d'événement sur la sélection de l'arrêt de départ
view.selectionArretDepart.addEventListener("change", () => {
  const arretDepartSelectionne = view.selectionArretDepart.value;

  if (!arretDepartSelectionne) {
    view.selectionArretArrivee.disabled = true;
    return;
  }

  // Remplissage de la sélection "ArretArrivee" en excluant l'arrêt de départ
  view.selectionArretArrivee.innerHTML =
    '<option value="">Sélectionner un arrêt d\'arrivée</option>';
  arretsData
    .filter((arret) => arret.parentStation.code !== arretDepartSelectionne)
    .forEach((arret) => {
      const option = document.createElement("option");
      option.value = arret.parentStation.code;
      option.textContent = arret.name;
      view.selectionArretArrivee.appendChild(option);
    });

  // Active la sélection des arrêts d'arrivée
  view.selectionArretArrivee.disabled = false;
});

// 🔹 Gestion du bouton Calculer
view.btnCalculer.addEventListener("click", async () => {
  const ligne = view.selectionLigne.value;
  const arretDepartCode = view.selectionArretDepart.value;
  const arretArriveeCode = view.selectionArretArrivee.value;
  let date = view.dateHeureInput.value;

  if (!ligne || !arretDepartCode || !arretArriveeCode) {
    console.warn("Veuillez remplir tous les champs avant de calculer.");
    return;
  }

  // Création de l'objet Search avec la direction calculée automatiquement
  const searchInstance = new Search(
    ligne,
    arretDepartCode,
    arretArriveeCode,
    date
  );

  console.log("Nouvelle recherche créée :", searchInstance);

  // Attente de la direction avant de récupérer les passages
  const checkDirection = async () => {
    while (!searchInstance._direction) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("Direction après attente :", searchInstance._direction);

    // Maintenant qu'on a la direction, récupérer les prochains passages

    if (!date) {
      const nextPassages = await searchInstance.getNextPassages();
      console.log("Prochains passages :", nextPassages);

      if (nextPassages.length >= 1) {
        view.tramTime.textContent = convertSecondsToCountdown(
          nextPassages[0].serviceDay,
          nextPassages[0].realtimeArrival
        );
      } else {
        view.tramTime.textContent = "Aucune donnée";
      }

      if (nextPassages.length >= 2) {
        view.secondTramTime.textContent = convertSecondsToCountdown(
          nextPassages[1].serviceDay,
          nextPassages[1].realtimeArrival
        );
      } else {
        view.secondTramTime.textContent = "Aucune donnée";
      }
    } else {
      const nextPassages = await searchInstance.getScheduledTramTimes();
      console.log("Horaires théoriques trouvés :", nextPassages);

      if (nextPassages.length >= 1) {
        view.tramTime.textContent = convertSecondsToCountdown(
          nextPassages[0].serviceDay,
          nextPassages[0].realtimeArrival
        );
      } else {
        view.tramTime.textContent = "Aucune donnée";
      }

      if (nextPassages.length >= 2) {
        view.secondTramTime.textContent = convertSecondsToCountdown(
          nextPassages[1].serviceDay,
          nextPassages[1].realtimeArrival
        );
      } else {
        view.secondTramTime.textContent = "Aucune donnée";
      }
    }
  };

  checkDirection();
});

// 🔹 Gestion du bouton Changer
view.btnChanger.addEventListener("click", () => {
  const ligne = view.selectionLigne.value;
  const arretDepartCode = view.selectionArretDepart.value;
  const arretArriveeCode = view.selectionArretArrivee.value;
  const date = view.dateHeureInput.value;

  if (!ligne || !arretDepartCode || !arretArriveeCode || !date) {
    console.warn("Veuillez remplir tous les champs avant de calculer.");
    return;
  }

  const searchInstance = new Search(
    ligne,
    arretDepartCode,
    arretArriveeCode,
    date
  );
  searchInstance.intervertirArrets();

  view.selectionArretDepart.value = searchInstance.arretDepart;
  view.selectionArretArrivee.value = searchInstance.arretArrivee;
});

function convertSecondsToCountdown(serviceDay, realtimeArrival) {
  const now = Math.floor(Date.now() / 1000); // Temps actuel en secondes UNIX
  const nextTramTime = serviceDay + realtimeArrival; // ✅ Convertir en timestamp absolu
  const diff = nextTramTime - now; // ✅ Calcul du temps restant

  if (diff < 0) {
    return "Aucun tram à venir";
  }

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

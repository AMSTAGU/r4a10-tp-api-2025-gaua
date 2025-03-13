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

// Stocker les instances des compteurs pour les arrêter si besoin
let firstCountdown = null;
let secondCountdown = null;

// Gestion du bouton Calculer
view.btnCalculer.addEventListener("click", async () => {
  const ligne = view.selectionLigne.value;
  const arretDepartCode = view.selectionArretDepart.value;
  const arretArriveeCode = view.selectionArretArrivee.value;
  let date = view.dateHeureInput.value;

  if (!ligne || !arretDepartCode || !arretArriveeCode) {
    console.warn("Veuillez remplir tous les champs avant de calculer.");
    return;
  }

  //  Arrêter les anciens `CountDown` s'ils existent
  if (firstCountdown) {
    firstCountdown.stop();
    firstCountdown = null;
  }
  if (secondCountdown) {
    secondCountdown.stop();
    secondCountdown = null;
  }

  // Création de l'objet Search
  const searchInstance = new Search(
    ligne,
    arretDepartCode,
    arretArriveeCode,
    date
  );
  console.log("Nouvelle recherche créée :", searchInstance);

  //  Récupération des prochains passages
  const nextPassages = date
    ? await searchInstance.getScheduledTramTimes()
    : await searchInstance.getNextPassages();

  console.log("Prochains passages :", nextPassages);

  // Vérification et affichage des temps de passage
  if (nextPassages.length >= 1) {
    firstCountdown = new CountDown(
      getSecondsRemaining(
        nextPassages[0].serviceDay,
        nextPassages[0].realtimeArrival
      )
    );
    firstCountdown.start((timer) => {
      view.tramTime.textContent = `${timer.hours}h ${timer.minutes}m ${timer.seconds}s`;
    });
  } else {
    view.tramTime.textContent = "Aucune donnée";
  }

  if (nextPassages.length >= 2) {
    secondCountdown = new CountDown(
      getSecondsRemaining(
        nextPassages[1].serviceDay,
        nextPassages[1].realtimeArrival
      )
    );
    secondCountdown.start((timer) => {
      view.secondTramTime.textContent = `${timer.hours}h ${timer.minutes}m ${timer.seconds}s`;
    });
  } else {
    view.secondTramTime.textContent = "Aucune donnée";
  }
});

function getSecondsRemaining(serviceDay, realtimeArrival) {
  const now = Math.floor(Date.now() / 1000); // Temps actuel en secondes UNIX
  const nextTramTime = serviceDay + realtimeArrival; // ✅ Convertir en timestamp absolu
  return nextTramTime - now; // ✅ Retourne le temps restant en secondes
}

// Gestion du bouton Changer
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

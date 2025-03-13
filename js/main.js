import { Search } from "./modelSearch.js";
import { view } from "./view.js";
import { CountDown } from "./modelCountdown.js";

//const countDown = new CountDown(300); // 300 secondes = 5 minutes
//countDown.start((timer) => {
//  console.log(
//    `Temps restant : ${timer.hours}h ${timer.minutes}m ${timer.seconds}s`
//  );
//});

// Désactive les sélections au départ
view.selectionArretDepart.disabled = true;
view.selectionArretArrivee.disabled = true;

let arretsData = []; // Stocke les arrêts récupérés

// Écouteur d'événement sur la sélection de la ligne
view.selectionLigne.addEventListener("change", async () => {
  const ligneSelectionnee = view.selectionLigne.value;

  if (!ligneSelectionnee) return;

  // Désactive les sélections pendant le chargement
  view.selectionArretDepart.disabled = true;
  view.selectionArretArrivee.disabled = true;

  try {
    // Appel API pour récupérer les arrêts en fonction de la ligne sélectionnée
    const response = await fetch(
      `https://data.mobilites-m.fr/api/routers/default/index/routes/${ligneSelectionnee}/clusters`
    );
    arretsData = await response.json();

    // Vérification si des arrêts sont trouvés
    if (!arretsData || arretsData.length === 0) {
      console.error("Aucun arrêt trouvé pour cette ligne.");
      return;
    }

    // Remplissage de la sélection "ArretDepart"
    view.selectionArretDepart.innerHTML =
      '<option value="">Sélectionner un arrêt de départ</option>';
    arretsData.forEach((arret) => {
      const option = document.createElement("option");
      option.value = arret.code; // On garde le code pour l'API
      option.textContent = arret.name; // On affiche le nom
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
    .filter((arret) => arret.code !== arretDepartSelectionne)
    .forEach((arret) => {
      const option = document.createElement("option");
      option.value = arret.code;
      option.textContent = arret.name;
      view.selectionArretArrivee.appendChild(option);
    });

  // Active la sélection des arrêts d'arrivée
  view.selectionArretArrivee.disabled = false;
});

view.btnCalculer.addEventListener("click", () => {
  // Récupération des valeurs sélectionnées
  const ligne = view.selectionLigne.value;
  const arretDepartCode = view.selectionArretDepart.value; // Utilise le code de l'arrêt
  const arretArriveeCode = view.selectionArretArrivee.value; // Utilise le code de l'arrêt
  const date = view.dateHeureInput.value;

  // Vérification que tout est bien sélectionné
  if (!ligne || !arretDepartCode || !arretArriveeCode || !date) {
    console.warn("Veuillez remplir tous les champs avant de calculer.");
    return;
  }

  // Création de l'objet Search
  const searchInstance = new Search(
    ligne,
    arretDepartCode,
    arretArriveeCode,
    date
  );

  // Affichage dans la console pour vérification
  console.log("Nouvelle recherche créée :", searchInstance);
});

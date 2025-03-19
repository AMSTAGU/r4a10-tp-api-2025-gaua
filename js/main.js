import { Search } from "./modelSearch.js";
import { view } from "./view.js";
import { CountDown } from "./modelCountdown.js";

// Ne pas afficher la date et l'heure par défaut
view.dateHeureInput.style.display = "none";

// Afficher la date et l'heure si l'utilisateur clique sur le bouton
view.AjouterHeure.addEventListener("click", () => {
  view.dateHeureInput.style.display = "block";
  view.AjouterHeure.style.display = "none";
});

// Déclaration de la variable searchInstance
let searchInstance = null;

// Récupérer les favoris depuis `localStorage`
let favoris = JSON.parse(localStorage.getItem("favoris")) || [];

// Charger les favoris au démarrage
loadFavorites();

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
      '<option value="">Sélectionner un arrêt</option>';
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
  resetFavorisSvg();
});

// Écouteur d'événement sur la sélection de l'arrêt de départ
view.selectionArretDepart.addEventListener("change", () => {
  const arretDepartSelectionne = view.selectionArretDepart.value;

  if (!arretDepartSelectionne) {
    view.selectionArretArrivee.disabled = true;
    return;
  }

  // Remplissage de la sélection "ArretArrivee" en excluant l'arrêt de départ
  view.selectionArretArrivee.innerHTML = '<option value="">Arrivée</option>';
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

  resetFavorisSvg();
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

  // Arrêter les anciens `CountDown` s'ils existent
  if (firstCountdown) {
    firstCountdown.stop();
    firstCountdown = null;
  }
  if (secondCountdown) {
    secondCountdown.stop();
    secondCountdown = null;
  }

  // Création de l'objet Search
  if (!searchInstance) {
    searchInstance = new Search(ligne, arretDepartCode, arretArriveeCode, date);
  } else {
    searchInstance._ligne = ligne;
    searchInstance._arretDepart = arretDepartCode;
    searchInstance._arretArrivee = arretArriveeCode;
    searchInstance._date = date;
  }
  searchInstance._direction = await searchInstance.initDirection(
    searchInstance._ligne,
    searchInstance._arretDepart,
    searchInstance._arretArrivee
  );
  console.log("Nouvelle direction calculée :", searchInstance._direction);

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
      view.FirstTramTimeHours.innerHTML = timer.hours;
      if (timer.minutes == 0) {
        view.FristTramTimeMinutes.innerHTML = "0";
      } else {
        view.FristTramTimeMinutes.innerHTML =
          timer.minutes > 9 ? timer.minutes : "0" + timer.minutes;
      }
      view.FirstTramTimeSeconds.innerHTML =
        timer.seconds > 9 ? timer.seconds : "0" + timer.seconds;
    });

    view.textLigne.innerHTML = searchInstance._ligne
      .split(":")
      .slice(1)
      .join(":");
    view.textArretDepart.innerHTML =
      view.selectionArretDepart.options[
        view.selectionArretDepart.selectedIndex
      ].text;
  } else {
    view.FirstTramTimeHours.innerHTML = "-";
    view.FristTramTimeMinutes.innerHTML = "-";
    view.FirstTramTimeSeconds.innerHTML = "-";
  }

  if (nextPassages.length >= 2) {
    secondCountdown = new CountDown(
      getSecondsRemaining(
        nextPassages[1].serviceDay,
        nextPassages[1].realtimeArrival
      )
    );
    secondCountdown.start((timer) => {
      view.SecondTramTimeHours.innerHTML = timer.hours;
      if (timer.minutes == 0) {
        view.FristTramTimeMinutes.innerHTML = "0";
      } else {
        view.SecondTramTimeMinutes.innerHTML =
          timer.minutes > 9 ? timer.minutes : "0" + timer.minutes;
      }
      view.SecondTramTimeSeconds.innerHTML =
        timer.seconds > 9 ? timer.seconds : "0" + timer.seconds;
    });
  } else {
    view.SecondTramTimeHours.innerHTML = "-";
    view.SecondTramTimeMinutes.innerHTML = "-";
    view.SecondTramTimeSeconds.innerHTML = "-";
  }
});

function getSecondsRemaining(serviceDay, realtimeArrival) {
  const now = Math.floor(Date.now() / 1000);
  const nextTramTime = serviceDay + realtimeArrival;
  return nextTramTime - now;
}

view.btnFavoris.addEventListener("click", () => {
  if (
    !view.selectionLigne.value ||
    !view.selectionArretDepart.value ||
    !view.selectionArretArrivee.value
  ) {
    console.warn("Veuillez remplir tous les champs avant d'ajouter un favori.");
    return;
  }

  // Récupérer les valeurs sélectionnées
  const favori = {
    ligne: view.selectionLigne.value,
    arretDepart: view.selectionArretDepart.value,
    arretDepartNom:
      view.selectionArretDepart.options[view.selectionArretDepart.selectedIndex]
        .text, // Récupérer le nom affiché
    arretArrivee: view.selectionArretArrivee.value,
    arretArriveeNom:
      view.selectionArretArrivee.options[
        view.selectionArretArrivee.selectedIndex
      ].text, // Récupérer le nom affiché
    date: view.dateHeureInput.value,
    ligneNom:
      view.selectionLigne.options[view.selectionLigne.selectedIndex].text, // Récupérer le nom affiché
  };

  // Vérifier si le favori existe déjà
  const index = favoris.findIndex(
    (f) =>
      f.ligne === favori.ligne &&
      f.arretDepart === favori.arretDepart &&
      f.arretArrivee === favori.arretArrivee &&
      f.date === favori.date
  );

  if (index !== -1) {
    // Si le favori existe, on le supprime
    favoris.splice(index, 1);
    console.log("Favori supprimé :", favori);
  } else {
    // Sinon, on l'ajoute
    favoris.push(favori);
    console.log("Favori ajouté :", favori);
  }

  // Mettre à jour `localStorage`
  localStorage.setItem("favoris", JSON.stringify(favoris));

  // Rafraîchir la liste des favoris
  updateFavorisList();
  loadFavorites();
  intervertFavorisSvg();
});

view.favoris.addEventListener("change", (event) => {
  const favoris = JSON.parse(localStorage.getItem("favoris")) || [];
  const selectedIndex = event.target.value;

  if (selectedIndex === "") return; // Aucun favori sélectionné

  const fav = favoris[selectedIndex];

  console.log("Favori sélectionné :", fav);

  // Appliquer les valeurs aux sélections
  view.selectionLigne.value = fav.ligne;
  view.selectionLigne.dispatchEvent(new Event("change")); // Déclenche le chargement des arrêts

  // Attendre que les arrêts soient chargés avant de mettre les valeurs des arrêts
  setTimeout(() => {
    view.selectionArretDepart.value = fav.arretDepart;
    view.selectionArretDepart.dispatchEvent(new Event("change"));
    if (fav.date) {
      view.dateHeureInput.value = fav.date;
      view.dateHeureInput.style.display = "block";
      view.AjouterHeure.style.display = "none";
    } else {
      view.dateHeureInput.style.display = "none";
      view.dateHeureInput.value = "";
      view.AjouterHeure.style.display = "";
    }
    view.selectionArretArrivee.value = fav.arretArrivee;

    setFavorisSvg();
  }, 500);
});

function updateFavorisList() {
  const favoris = JSON.parse(localStorage.getItem("favoris")) || [];
  view.favoris.innerHTML = "";
  favoris.forEach((favori, index) => {
    const li = document.createElement("li");
    li.textContent = `Favori ${index + 1} : Ligne ${favori.ligne}, départ ${
      favori.arretDepart
    }, arrivée ${favori.arretArrivee}, date ${favori.date}`;
    view.favoris.appendChild(li);
  });
}

function loadFavorites() {
  const favoris = JSON.parse(localStorage.getItem("favoris")) || [];
  const favorisSelect = document.getElementById("favoris");

  // Vider et réinitialiser le <select>
  favorisSelect.innerHTML = '<option value="">Favoris</option>';

  // Ajouter chaque favori à la liste
  favoris.forEach((fav, index) => {
    const option = document.createElement("option");
    option.value = index; // On stocke l'index du favori
    option.textContent = `${fav.ligneNom}, ${fav.arretDepartNom} ➝ ${
      fav.arretArriveeNom
    }, ${
      fav.date
        ? (() => {
            const date = new Date(fav.date);
            const month = String(date.getMonth() + 1).padStart(2, "0"); // getMonth() commence à 0
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${month}/${day} à ${hours}:${minutes}`;
          })()
        : "Maintenant"
    }`;
    favorisSelect.appendChild(option);
  });
}

view.btnChanger.addEventListener("click", () => {
  if (!searchInstance) return;

  // Inversion des arrêts dans `searchInstance`
  const temp = searchInstance._arretDepart;
  searchInstance._arretDepart = searchInstance._arretArrivee;
  searchInstance._arretArrivee = temp;

  // Mise à jour des options d'arrêts d'arrivée
  updateArretArriveeOptions(searchInstance._arretDepart);

  // Appliquer les nouvelles valeurs dans les `<select>`
  view.selectionArretDepart.value = searchInstance._arretDepart;
  view.selectionArretDepart.dispatchEvent(new Event("change"));

  setTimeout(() => {
    view.selectionArretArrivee.value = searchInstance._arretArrivee;
  }, 300);

  console.log("Arrêts inversés et rechargés :", searchInstance);
  resetFavorisSvg();
});

function updateArretArriveeOptions(arretDepartSelectionne) {
  if (!arretDepartSelectionne) return;

  // On remet à jour les options des arrêts d'arrivée
  view.selectionArretArrivee.innerHTML =
    '<option value="">Sélectionner un arrêt d\'arrivée</option>';

  arretsData.forEach((arret) => {
    const option = document.createElement("option");
    option.value = arret.parentStation.code;
    option.textContent = arret.name;
    view.selectionArretArrivee.appendChild(option);
  });

  console.log("Options d'arrêts mises à jour après inversion");
}

// Changer le svg au changement de l'arrêt de départ
view.selectionArretArrivee.addEventListener("change", () => {
  resetFavorisSvg();
});

// Reset le svg favoris au changement de l'heure
view.dateHeureInput.addEventListener("change", () => {
  resetFavorisSvg();
});

function intervertFavorisSvg() {
  view.svgFavoris.src = view.svgFavoris.src.includes("FavorisFill.svg")
    ? "./src/Favoris.svg"
    : "./src/FavorisFill.svg";
}

function resetFavorisSvg() {
  view.svgFavoris.src = "./src/Favoris.svg";
}

function setFavorisSvg() {
  view.svgFavoris.src = "./src/FavorisFill.svg";
}

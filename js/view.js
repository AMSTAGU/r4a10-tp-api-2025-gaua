export const view = {
  // Sélecteurs
  selectionLigne: document.getElementById("selection_ligne"),
  selectionArretDepart: document.getElementById("arret_depart"),
  selectionArretArrivee: document.getElementById("arret_arrivee"),

  // Champ de sélection de date et heure
  dateHeureInput: document.getElementById("date_heure"),

  // Boutons
  //btnChanger: document.getElementById("btn_changer"),
  btnsChanger: document.querySelectorAll("#btn_changer"),

  //  btnCalculer: document.getElementById("btn_calculer"),
  btnCalculers: document.querySelectorAll("#btn_calculer"),

  // Favoris
  favoris: document.getElementById("favoris"),
  // btnFavoris: document.getElementById("btn_favoris"),

  btnsFavoris: document.querySelectorAll("#btn_favoris"),

  // Text Arret / Ligne
  textArretDepart: document.getElementById("textArret"),
  textLigne: document.getElementById("textLigne"),

  // Svg favoris
  //svgFavoris: document.getElementById("favorisSvg"),

  svgsFavoris: document.querySelectorAll("#favorisSvg"),

  // CountDown
  FirstTramTimeHours: document.getElementById("FirstTramTimeHours"),
  FristTramTimeMinutes: document.getElementById("FirstTramTimeMin"),
  FirstTramTimeSeconds: document.getElementById("FirstTramTimeSeconds"),

  SecondTramTimeHours: document.getElementById("SecondTramTimeHours"),
  SecondTramTimeMinutes: document.getElementById("SecondTramTimeMin"),
  SecondTramTimeSeconds: document.getElementById("SecondTramTimeSeconds"),

  // Ajouter Heure
  AjouterHeure: document.getElementById("AjouterHeure"),

  // Texte d'érreur
  ErrorText: document.getElementById("Error-text"),
};

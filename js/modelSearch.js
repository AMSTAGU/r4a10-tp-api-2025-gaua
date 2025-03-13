export class Search {
  constructor(ligne, arretDepart, arretArrivee, date) {
    this._ligne = ligne;
    this._arretDepart = arretDepart;
    this._arretArrivee = arretArrivee;
    this._date = date;
    this._direction = this.initDirection(ligne, arretDepart, arretArrivee);
  }

  async initDirection(ligne, arretDepart, arretArrivee) {
    try {
      const response = await fetch(
        `https://data.mobilites-m.fr/api/ficheHoraires/json?route=${ligne}`
      );

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.statusText}`);
      }

      const data = await response.json();

      // On récupère la liste des arrêts (on prend uniquement la première direction trouvée)
      const arrets = data["0"]?.arrets || data["1"]?.arrets;

      if (!arrets || arrets.length === 0) {
        throw new Error("Aucun arrêt trouvé pour cette ligne.");
      }

      // Trouver les index des arrêts de départ et d’arrivée
      const indexDepart = arrets.findIndex(
        (stop) => stop.parentStation.code === arretDepart
      );
      const indexArrivee = arrets.findIndex(
        (stop) => stop.parentStation.code === arretArrivee
      );

      if (indexDepart === -1 || indexArrivee === -1) {
        throw new Error(
          "Arrêt de départ ou d'arrivée non trouvé dans la liste."
        );
      }

      // Déterminer la direction en fonction de l'ordre des arrêts
      if (indexDepart < indexArrivee) {
        this._direction = arrets[arrets.length - 1].name; // Dernier arrêt = direction
      } else {
        this._direction = arrets[0].name; // Premier arrêt = direction
      }

      console.log(`Direction déterminée : ${this._direction}`);
    } catch (error) {
      console.error("Erreur lors de la récupération de la direction :", error);
    }
  }
  get ligne() {
    return this._ligne;
  }

  get arretDepart() {
    return this._arretDepart;
  }

  get arretArrivee() {
    return this._arretArrivee;
  }

  get date() {
    return this._date;
  }

  get direction() {
    return this._direction;
  }
}

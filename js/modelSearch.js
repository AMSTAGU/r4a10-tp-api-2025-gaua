export class Search {
  constructor(ligne, arretDepart, arretArrivee, date) {
    this._ligne = ligne;
    this._arretDepart = arretDepart;
    this._arretArrivee = arretArrivee;
    this._date = date;
    this._direction = null;

    // Récupérer la direction et l'affecter une fois résolue
    this.initDirection(ligne, arretDepart, arretArrivee).then((direction) => {
      this._direction = direction;
      console.log("Direction définie :", this._direction);
    });
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

      // Récupérer la première liste d'arrêts disponibles
      const arrets =
        Object.values(data).find((direction) => direction?.arrets?.length)
          ?.arrets || [];

      if (arrets.length === 0) {
        throw new Error("Aucun arrêt trouvé pour cette ligne.");
      }

      // Trouver les index des arrêts de départ et d'arrivée
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
      const direction =
        indexDepart < indexArrivee
          ? arrets[arrets.length - 1].name
          : arrets[0].name;

      console.log(`Direction déterminée : ${direction}`);
      return direction; // 🔹 On retourne la valeur correcte !
    } catch (error) {
      console.error("Erreur lors de la récupération de la direction :", error);
      return null;
    }
  }

  intervertirArrets() {
    const temp = this._arretDepart;
    this._arretDepart = this._arretArrivee;
    this._arretArrivee = temp;

    this._direction = this.initDirection(
      this._ligne,
      this._arretDepart,
      this._arretArrivee
    );
  }

  async getNextPassages() {
    if (!this._direction) {
      console.log("Attente de la direction...");
      this._direction = await this.initDirection(
        this._ligne,
        this._arretDepart,
        this._arretArrivee
      );
    }

    console.log("Direction finale utilisée pour la requête :", this._direction);

    const apiUrl = `https://data.mobilites-m.fr/api/routers/default/index/clusters/${this._arretDepart}/stoptimes?route=${this._ligne}&showCancelledTrips=false`;

    try {
      const response = await fetch(apiUrl, {
        headers: { origin: "mon_appli" },
      });

      if (!response.ok) throw new Error(`Erreur API: ${response.statusText}`);

      const data = await response.json();
      if (!data || data.length === 0) throw new Error("Aucun passage trouvé.");

      // 🔹 On récupère uniquement les horaires pour la direction souhaitée
      const times = data
        .filter((dir) => {
          const stopNameParts = dir.pattern.lastStopName.split(",");
          const cleanedStopName =
            stopNameParts.length > 1
              ? stopNameParts[1].trim()
              : dir.pattern.lastStopName.trim();

          return cleanedStopName === this._direction;
        })
        .flatMap((dir) => dir.times)
        .sort(
          (a, b) =>
            a.serviceDay +
            a.realtimeArrival -
            (b.serviceDay + b.realtimeArrival)
        ) // Trie par temps absolu
        .slice(0, 2) // Prend les 2 premiers
        .map((passage) => ({
          serviceDay: passage.serviceDay, // ✅ Prend serviceDay
          realtimeArrival: passage.realtimeArrival, // ✅ Prend realtimeArrival
        }));

      console.log(
        "Prochains passages avec serviceDay et realtimeArrival :",
        times
      );
      return times;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des prochains passages :",
        error
      );
      return [];
    }
  }

  async getScheduledTramTimes() {
    if (!this._date) {
      console.warn("Aucune date sélectionnée, utilisation du temps réel.");
      return this.getNextPassages();
    }

    // 1. Convertir la date et l'heure en secondes
    const [dateStr, heureStr] = this._date.split("T"); // Séparer date et heure
    const dateFormatted = dateStr.replace(/-/g, ""); // Convertit "2025-03-13" en "20250313"
    const [hours, minutes] = heureStr.split(":").map(Number);
    const selectedTime = hours * 3600 + minutes * 60; // Convertit HH:mm en secondes

    console.log(
      `Recherche pour la date : ${dateFormatted}, heure : ${selectedTime}s`
    );

    // 2. Récupérer les horaires théoriques pour l'arrêt d'arrivée
    const scheduleApiUrl = `https://data.mobilites-m.fr/api/routers/default/index/clusters/${this._arretArrivee}/stoptimes/${dateFormatted}?route=${this._ligne}`;

    try {
      const response = await fetch(scheduleApiUrl, {
        headers: { origin: "mon_appli" },
      });
      if (!response.ok) throw new Error(`Erreur API: ${response.statusText}`);

      const data = await response.json();
      if (!data || data.length === 0) throw new Error("Aucun passage trouvé.");

      // 3. Filtrer pour garder uniquement les trajets de la bonne direction
      const filteredTimes = data
        .filter((dir) => {
          const stopNameParts = dir.pattern.lastStopName.split(",");
          const cleanedStopName =
            stopNameParts.length > 1
              ? stopNameParts[1].trim()
              : dir.pattern.lastStopName.trim();
          return cleanedStopName === this._direction;
        })
        .flatMap((dir) => dir.times);

      if (filteredTimes.length === 0)
        throw new Error("Aucun trajet trouvé pour cette direction.");

      // 4. Trouver l'horaire le plus proche + celui juste après
      const sortedTrips = filteredTimes.sort(
        (a, b) => a.scheduledArrival - b.scheduledArrival
      );
      const closestTrips = sortedTrips
        .filter((trip) => trip.scheduledArrival >= selectedTime)
        .slice(0, 2);

      if (closestTrips.length === 0) {
        console.warn(
          "Aucun horaire valide trouvé après l'heure sélectionnée. On prend les deux prochains."
        );
        return this.getNextPassages(); // 🔹 Retour aux horaires temps réel si impossible
      }
      console.log("Trips sélectionnés :", closestTrips);

      // 5. Maintenant, récupérer l'heure de départ pour les deux `tripId` sélectionnés
      const departApiUrl = `https://data.mobilites-m.fr/api/routers/default/index/clusters/${this._arretDepart}/stoptimes/${dateFormatted}?route=${this._ligne}`;

      const departResponse = await fetch(departApiUrl, {
        headers: { origin: "mon_appli" },
      });
      if (!departResponse.ok)
        throw new Error(`Erreur API: ${departResponse.statusText}`);

      const departData = await departResponse.json();
      const departTimes = departData.flatMap((dir) => dir.times);

      // Chercher les mêmes `tripId` pour l'arrêt de départ
      const closestDepartTrips = closestTrips.map((trip) =>
        departTimes.find((departTrip) => departTrip.tripId === trip.tripId)
      );

      // Vérification si on a bien trouvé les horaires de départ
      if (closestDepartTrips.some((trip) => !trip)) {
        console.warn(
          "Un des trips sélectionnés ne contient pas d'horaire de départ. On prend les prochains trams."
        );
        return this.getNextPassages();
      }

      // 6. Vérifier si l'horaire de départ du premier trajet est déjà dépassé
      const now = Math.floor(Date.now() / 1000); // Temps UNIX actuel
      const firstDepartureTime =
        closestDepartTrips[0].serviceDay +
        closestDepartTrips[0].scheduledDeparture;

      if (firstDepartureTime < now) {
        console.warn(
          "Le premier tram est déjà parti. On prend les deux prochains en temps réel."
        );
        return this.getNextPassages(); // 🔹 Si le tram est parti, on prend les prochains en temps réel
      }

      // là j'ai l'heure de depart du tram de depart avec l'heure d'arrive la plus accurate
      console.log("Horaires de départ valides :", closestDepartTrips);

      // 7. Vérifier si le 1er Trip ID est dans le temps réel

      const realtimeApiUrl = `https://data.mobilites-m.fr/api/routers/default/index/clusters/${this._arretDepart}/stoptimes?route=${this._ligne}&showCancelledTrips=false`;

      const realtimeResponse = await fetch(realtimeApiUrl, {
        headers: { origin: "mon_appli" },
      });
      if (!realtimeResponse.ok)
        throw new Error(`Erreur API: ${realtimeResponse.statusText}`);

      const realtimeData = await realtimeResponse.json();
      const realtimeTrips = realtimeData.flatMap((dir) => dir.times);

      // 🔹 Vérifier si le premier trajet est dans le temps réel
      const firstTripRealtime = realtimeTrips.find(
        (trip) => trip.tripId === closestDepartTrips[0].tripId
      );

      if (firstTripRealtime) {
        console.log(
          `Premier trajet (${firstTripRealtime.tripId}) trouvé en temps réel.`
        );

        let secondTripRealtime = null;

        // Vérifier si le deuxième trajet est aussi en temps réel
        if (closestDepartTrips[1]) {
          secondTripRealtime = realtimeTrips.find(
            (trip) => trip.tripId === closestDepartTrips[1].tripId
          );
        }

        console.log(
          `Deuxième trajet ${
            secondTripRealtime ? "trouvé" : "non trouvé"
          } en temps réel.`
        );

        // Si les deux trajets sont en temps réel, on prend leurs horaires réels
        if (secondTripRealtime) {
          return [
            {
              serviceDay: firstTripRealtime.serviceDay,
              realtimeArrival: firstTripRealtime.realtimeDeparture,
            },
            {
              serviceDay: secondTripRealtime.serviceDay,
              realtimeArrival: secondTripRealtime.realtimeDeparture,
            },
          ];
        }

        // Si le second trajet n'est pas en temps réel, on prend son temps théorique
        return [
          {
            serviceDay: firstTripRealtime.serviceDay,
            realtimeArrival: firstTripRealtime.realtimeDeparture,
          },
          {
            serviceDay: closestDepartTrips[1].serviceDay,
            realtimeArrival: closestDepartTrips[1].scheduledDeparture,
          },
        ];
      }

      // Si le premier trajet n'est PAS en temps réel, on retourne les deux temps théoriques
      console.warn(
        "Premier trajet non trouvé en temps réel, retour aux horaires théoriques."
      );
      return closestDepartTrips.map((trip) => ({
        serviceDay: trip.serviceDay,
        realtimeArrival: trip.scheduledDeparture,
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération des horaires :", error);
      return [];
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

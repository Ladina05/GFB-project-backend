/**
 * Calcul complet du Modèle de Wilson
 * Basé sur le cours GFB - Chapitre IV
 *
 * Formules :
 * Coût de stockage = f*N + (C*t) / (2N*100)
 * N optimal = sqrt(C*t / 200*f)
 * Qe = C / N
 * Période = 12 / N (en mois)
 * Point de commande = (C/12) * d + Ss
 */

function calculerWilson({
  consommation_annuelle,   // C
  prix_unitaire,           // Pu
  cout_passation,          // f
  taux_possession,         // t en %
  stock_initial = 0,       // SI
  delai_approvisionnement = 0, // d en mois
  stock_securite = 0,      // Ss
}) {
  const C = parseFloat(consommation_annuelle);
  const Pu = parseFloat(prix_unitaire);
  const f = parseFloat(cout_passation);
  const t = parseFloat(taux_possession);
  const SI = parseFloat(stock_initial);
  const d = parseFloat(delai_approvisionnement);
  const Ss = parseFloat(stock_securite);

  // Valeur de la consommation annuelle
  const valeur_annuelle = C * Pu;

  // N optimal = sqrt(C * Pu * t / (200 * f))
  // Formule du cours : N = sqrt(Ct / 200f) où C = valeur annuelle
  const N_optimal = Math.sqrt((valeur_annuelle * t) / (200 * f));

  // Quantité économique par commande
  const Qe = C / N_optimal;

  // Période entre commandes (en mois)
  const periode = 12 / N_optimal;

  // Coût minimal de stockage
  const cout_passation_total = f * N_optimal;
  const cout_possession_total = (valeur_annuelle * t) / (200 * N_optimal);
  const cout_stockage_min = cout_passation_total + cout_possession_total;

  // Point de commande (Stock critique)
  // SCM = (C/12) * d + Ss
  const consommation_mensuelle = C / 12;
  const point_commande = consommation_mensuelle * d + Ss;

  // Simulation pour différentes cadences (N-2 à N+2)
  const n_arrondi = Math.round(N_optimal);
  const simulations = [];

  const n_min = Math.max(1, n_arrondi - 2);
  const n_max = n_arrondi + 2;

  for (let n = n_min; n <= n_max; n++) {
    const cp = f * n;
    const cpos = (valeur_annuelle * t) / (200 * n);
    const ct = cp + cpos;
    const q = C / n;
    const per = 12 / n;

    simulations.push({
      cadence_n: n,
      cout_passation: Math.round(cp * 100) / 100,
      cout_possession: Math.round(cpos * 100) / 100,
      cout_total: Math.round(ct * 100) / 100,
      quantite_par_commande: Math.round(q * 100) / 100,
      periode_mois: Math.round(per * 100) / 100,
      est_optimal: n === n_arrondi,
    });
  }

  return {
    // Données d'entrée
    inputs: { C, Pu, f, t, SI, d, Ss, valeur_annuelle },

    // Résultats principaux
    N_optimal: Math.round(N_optimal * 10000) / 10000,
    N_arrondi: n_arrondi,
    Qe: Math.round(Qe * 100) / 100,
    periode_mois: Math.round(periode * 100) / 100,
    periode_jours: Math.round((365 / N_optimal) * 100) / 100,

    // Coûts
    cout_passation_total: Math.round(cout_passation_total * 100) / 100,
    cout_possession_total: Math.round(cout_possession_total * 100) / 100,
    cout_stockage_min: Math.round(cout_stockage_min * 100) / 100,

    // Stock
    point_commande: Math.round(point_commande * 100) / 100,
    consommation_mensuelle: Math.round(consommation_mensuelle * 100) / 100,
    stock_securite: Ss,

    // Simulations
    simulations,
  };
}

module.exports = { calculerWilson };
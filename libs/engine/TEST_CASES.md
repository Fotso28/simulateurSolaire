# Cas de test du moteur

Paramètres par défaut v1 (DoD 0,80 / 0,50, η 0,90, PR 0,70, marges 1,25, f_s 2, ε 3 %,
ρ 0,0225 Ω·mm²/m, longueurs 15 / 2 / 2 / 5 m) et catalogue `DEFAULT_CATALOG`.
Panneau par défaut : 450 Wc, V_oc 49,5 V, V_mp 41,5 V, I_sc 11,6 A.
Intensités admissibles : cuivre PR (XLPE), pose C (10 mm² → 80 A, 16 → 107, 25 → 138, 35 → 171, 50 → 209).
Tests : `src/test/reference-cases.spec.ts` (tolérance 1 %). Entrées : `src/test/fixtures.ts`.

## Cas 1 — Douala (référence du TRD)

Tableau du TRD reproduit ligne à ligne, y compris variantes 0,5 j (1 × 24 V 100 Ah, 0,53 j)
et 1,5 j (3 × 24 V 100 Ah, 1,58 j). Compléments calculés par le moteur :
fusible régulateur → batteries 80 A (≥ 70,3 A), disjoncteur de sortie 6 A (≥ 5,43 A), différentiel 25 A,
sectionneur DC 16 A (≥ 14,5 A), câble onduleur → tableau 1,5 mm² (5,43 A).

## Cas 2 — Système 48 V avec climatiseur (Yaoundé, H = 4,5 ; pro par appareils ; lithium ; 1 j)

| Appareil                  | q   | P (W)     | h   | τ    | k   | E (Wh/j)   |
| ------------------------- | --- | --------- | --- | ---- | --- | ---------- |
| Climatiseur 1,5 CV        | 1   | 1 250     | 6   | 0,7  | 3   | 5 250      |
| Réfrigérateur-congélateur | 1   | 180       | 24  | 0,45 | 4   | 1 944      |
| Ampoule LED               | 10  | 10        | 6   | 1    | 1   | 600        |
| Télévision                | 1   | 100       | 5   | 1    | 1   | 500        |
| Ordinateur portable       | 2   | 60        | 6   | 1    | 1   | 720        |
| Ventilateur               | 3   | 60        | 8   | 1    | 1,5 | 1 440      |
| Box internet              | 1   | 12        | 24  | 1    | 1   | 288        |
| **Total**                 |     | **1 942** |     |      |     | **10 742** |

| Étape                    | Calcul                                                                                                                                                                             | Attendu                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Pointe                   | P_dem = 1 942 + max(2 × 1 250 ; 3 × 180 ; 0,5 × 60)                                                                                                                                | 1 942 W ; 4 442 W             |
| Champ requis             | 10 742 / (4,5 × 0,7)                                                                                                                                                               | 3 410 Wc                      |
| Tension                  | 1,25 × 1 942 = 2 428 W ≤ 3 000, mais P_PV > 2 500 Wc                                                                                                                               | 48 V                          |
| Onduleur                 | ≥ 2 428 W et 2 × P ≥ 4 442 W (48 V dès 3 000 W)                                                                                                                                    | 3 000 W 48 V                  |
| Panneaux                 | ⌈3 410 / 450⌉ = 8 ; N_s,max = ⌊250 / 54,45⌋ = 4 ; N_s,min = ⌈60 / 41,5⌉ = 2                                                                                                        | 8 × 450 = 3 600 Wc, 4 s × 2 p |
| Régulateur               | 1,25 × 3 600 / 48 = 93,75 A (80 A insuffisant) ; entrée 2 × 11,6 × 1,25 = 29 A                                                                                                     | MPPT 100 A / 250 V            |
| Batteries                | 10 742 / 0,72 = 14 919 Wh → 310,8 Ah ; 400 Ah mini, 48 V 200 Ah = 2 unités                                                                                                         | 2 × 48 V 200 Ah (19,2 kWh)    |
| Autonomie                | 400 × 48 × 0,72 / 10 742                                                                                                                                                           | 1,287 j                       |
| Couverture               | 3 600 × 4,5 × 0,7 / 10 742                                                                                                                                                         | 105,6 %                       |
| Câble PV                 | 29 A, 166 V, 15 m → 3,93 mm²                                                                                                                                                       | 4 mm²                         |
| Câble régulateur → batt. | 93,75 A, 48 V, 2 m → 5,86 → 6 mm² ; admissible 58 / 80 A insuffisant                                                                                                               | 16 mm²                        |
| Câble batt. → onduleur   | 1,25 × 3 000 / (48 × 0,9) = 86,8 A → 5,43 → 6 mm² ; admissible                                                                                                                     | 16 mm²                        |
| Câble onduleur → tableau | 16,3 A, 230 V, 5 m → 0,53 mm²                                                                                                                                                      | 1,5 mm²                       |
| Protections              | fusible batt. ≥ 86,8 → 100 A ; fusible régulateur ≥ 93,75 → 100 A ; disjoncteur ≥ 16,3 → 20 A ; différentiel 25 A ; sectionneur ≥ 29 → 32 A ; 2 chaînes → pas de fusible de chaîne |                               |
| Variante 0,5 j           | 155,4 Ah → 1 × 48 V 200 Ah                                                                                                                                                         | 0,643 j                       |
| Variante 1,5 j           | 466,2 Ah → 5 × 48 V 100 Ah (24 kWh)                                                                                                                                                | 1,609 j                       |

## Cas 3 — Professionnel en puissance totale (Garoua, H = 5,6 ; hybride ; lithium ; 2 j)

Saisie : P = 1 800 W, E = 6 000 Wh/j, facteur de démarrage 1,5.

| Étape                  | Calcul                                                                                            | Attendu                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Pointe                 | P_inst = 1 800 ; P_dem = 1 800 × 1,5                                                              | 1 800 W ; 2 700 W                         |
| Champ requis           | 6 000 / (5,6 × 0,7)                                                                               | 1 531 Wc                                  |
| Tension                | 2 250 W ≤ 3 000 et 1 531 ≤ 2 500 Wc                                                               | 24 V                                      |
| Onduleur hybride       | ≥ 2 250 W et ≥ 1 350 W ; 1 500 / 2 000 W insuffisants                                             | hybride 3 000 W 24 V (MPPT 100 A / 450 V) |
| Panneaux               | ⌈1 531 / 450⌉ = 4 ; N_s,max = ⌊450 / 54,45⌋ = 8                                                   | 4 × 450 = 1 800 Wc, 4 s × 1 p             |
| MPPT intégré           | 1,25 × 1 800 / 24 = 93,75 A ≤ 100 A                                                               | pas de régulateur séparé                  |
| Batteries              | 6 000 × 2 / 0,72 = 16 667 Wh → 694,4 Ah ; 700 Ah mini : 7 × 24 V 100 Ah                           | 7 × 24 V 100 Ah (16,8 kWh)                |
| Autonomie              | 700 × 24 × 0,72 / 6 000                                                                           | 2,016 j                                   |
| Couverture             | 1 800 × 5,6 × 0,7 / 6 000                                                                         | 117,6 %                                   |
| Câble PV               | 14,5 A, 166 V → 1,97 mm²                                                                          | 4 mm² (minimum)                           |
| Câble batt. → onduleur | max(1,25 × 3 000 / 21,6 = 173,6 A ; 93,75 A) → 21,7 → 25 mm² ; admissible 138 / 171 A insuffisant | 50 mm²                                    |
| Fusible batterie       | ≥ 173,6 A                                                                                         | 200 A                                     |
| Sortie                 | 16,3 A → 1,5 mm², disjoncteur 20 A, différentiel 25 A                                             |                                           |
| Variante 1,5 j         | 520,8 Ah → 600 Ah : 3 × 24 V 200 Ah (moins d'unités que 6 × 100 Ah)                               | 1,728 j                                   |
| Variante 3 j           | 1 041,7 Ah → 11 × 24 V 100 Ah (26,4 kWh)                                                          | 3,168 j                                   |

Pas de fourchette (mode pro). Variante : avec 2 000 W / 8 000 Wh, le MPPT du 3 000 W 24 V ne suffit plus
(5 panneaux → 117 A) : le moteur passe en 48 V (hybride 3 000 W 48 V), voir `behaviour.spec.ts`.

## Cas 4 — Plomb / gel (Ebolowa, H = 4,3 ; particulier, puissances du catalogue ; 1 j)

| Appareil       | q   | P min / typ / max | h   | τ   | E min / typ / max         |
| -------------- | --- | ----------------- | --- | --- | ------------------------- |
| Ampoule LED    | 4   | 5 / 10 / 15       | 6   | 1   | 120 / 240 / 360           |
| Télévision 32" | 1   | 30 / 45 / 60      | 5   | 1   | 150 / 225 / 300           |
| Ventilateur    | 1   | 45 / 60 / 75      | 8   | 1   | 360 / 480 / 600           |
| Chargeur       | 2   | 5 / 12,5 / 20     | 3   | 1   | 30 / 75 / 120             |
| Réfrigérateur  | 1   | 80 / 140 / 200    | 24  | 0,4 | 768 / 1 344 / 1 920       |
| **Total**      |     | 185 / 310 / 435   |     |     | **1 428 / 2 364 / 3 300** |

| Étape               | Typique                                                 | Min                 | Max                                        |
| ------------------- | ------------------------------------------------------- | ------------------- | ------------------------------------------ |
| Pointe              | 310 ; 310 + 3 × 140 = 730 W                             | 185 ; 425 W         | 435 ; 1 035 W                              |
| Champ requis        | 2 364 / 3,01 = 785 Wc                                   | 474 Wc              | 1 096 Wc                                   |
| Tension             | 12 V                                                    | 12 V                | 24 V (> 1 000 Wc)                          |
| Onduleur            | ≥ 387,5 W → 600 W 12 V                                  | 300 W               | 1 000 W 24 V                               |
| Panneaux            | 2 × 450, 2 s × 1 p                                      | 2                   | 3 (3 s)                                    |
| Régulateur          | 1,25 × 900 / 12 = 93,75 A → MPPT 100 A / 250 V          | 100 A               | 70,3 A → 80 A / 250 V                      |
| Batteries (DoD 0,5) | 2 364 / 0,45 / 12 = 437,8 Ah → 3 × 12 V 150 Ah (450 Ah) | 264 Ah → 2 × 150 Ah | 305,6 Ah à 24 V → 2 s × 2 p de 12 V 200 Ah |
| Autonomie           | 450 × 12 × 0,45 / 2 364 = 1,028 j                       | 1,134 j             | 1,309 j                                    |
| Couverture          | 900 × 3,01 / 2 364 = 114,6 %                            |                     |                                            |

Câbles (typique) : PV 14,5 A / 83 V → 3,93 → 4 mm² ; régulateur → batteries 93,75 A / 12 V → 23,4 → 25 mm² ;
batteries → onduleur 1,25 × 600 / 10,8 = 69,4 A → 17,4 → 25 mm² ; sortie 3,26 A → 1,5 mm².
Protections : fusible batterie 80 A, fusible régulateur 100 A, disjoncteur 6 A.
Variantes : 0,5 j → 218,9 Ah → 1 × 12 V 250 Ah (0,571 j) ; 1,5 j → 656,7 Ah → 7 × 12 V 100 Ah (1,599 j).

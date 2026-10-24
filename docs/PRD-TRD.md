
# Simulateur de dimensionnement solaire — PRD & TRD

2026-10-24 · @max Payner · Version 1.0 — Cameroun et Gabon


# Partie 1 — Product Requirements Document (PRD)


## Contexte et objectifs

Le simulateur donne à un particulier comme à un installateur la liste complète du matériel solaire adapté à ses besoins, des panneaux aux batteries, en quelques minutes. Il couvre le Cameroun et le Gabon au lancement.

**Problème.** Un particulier ne connaît ni la puissance de ses appareils ni la méthode de dimensionnement : il dépend du devis d'un vendeur, souvent mal calibré. Un professionnel refait les mêmes calculs à la main pour chaque client.

**Objectifs.**

- Donner au particulier une estimation fiable, présentée en fourchette, à partir d'une simple liste d'appareils.
- Donner au professionnel une nomenclature exacte et complète à partir des puissances réelles ou de la puissance totale.
- Laisser chacun choisir son autonomie, puis augmenter ou réduire la puissance et le stockage en voyant l'effet immédiatement.
- Adapter le calcul à l'ensoleillement moyen de la région choisie.


## Utilisateurs cibles

Le système est multimodal : deux modes de saisie pour deux publics, et un back-office pour l'administrateur.

| Profil | Ce qu'il sait | Ce qu'il saisit | Ce qu'il obtient |
|---|---|---|---|
| Particulier (non averti) | Ses appareils et leur nombre | Pays, région, appareils choisis dans des listes illustrées, quantités, heures d'usage pré-remplies, autonomie | Une fourchette min–max, une proposition médiane, une nomenclature simplifiée et deux variantes d'autonomie |
| Professionnel (installateur, technicien, bureau d'études) | Les puissances réelles ou la puissance totale | Pays, région, appareils avec puissance exacte, ou puissance totale et énergie journalière, autonomie, technologie de batterie, longueurs de câbles | Un dimensionnement exact et la nomenclature complète : câblage série/parallèle, sections de câbles, protections |
| Administrateur | Le marché et le matériel | Catalogue d'appareils et illustrations, régions et ensoleillement, matériel de référence, paramètres de calcul | Un outil à jour sans intervention d'un développeur |


## Périmètre

Le MVP couvre le calcul complet pour les deux modes et le back-office ; les prix, la saisie par photo et les systèmes raccordés au réseau viennent ensuite.

**Dans le MVP**

- Choix du pays (Cameroun, Gabon) puis de la région.
- Mode particulier : listes déroulantes par catégorie, appareils illustrés, quantités, récapitulatif en direct.
- Mode professionnel : appareils avec puissance exacte, ou puissance totale et énergie journalière.
- Choix de l'autonomie, avec variantes inférieure et supérieure.
- Configurateur : avancer ou reculer sur l'onduleur, le stockage et le champ solaire.
- Nomenclature complète : panneaux, régulateur, batteries, onduleur, câbles, protections.
- Avertissement saison des pluies sur chaque résultat.
- Back-office : appareils et illustrations, régions, matériel, paramètres de calcul.

**Hors MVP**

- Saisie des équipements par photo ou vidéo, avec reconnaissance automatique.
- Prix du matériel et devis chiffré en FCFA.
- Systèmes hybrides rechargés par le réseau (ENEO, SEEG) pour les délestages.
- Comptes professionnels avec historique des simulations.
- Version anglaise.


## Parcours utilisateur

Les deux modes partagent le même début et la même fin ; seule la saisie des besoins change.

1. **Localisation.** L'utilisateur choisit le pays, puis la région. L'ensoleillement moyen annuel de la région est chargé.
2. **Choix du mode.** « Je ne connais pas la puissance de mes appareils » (particulier) ou « Je connais mes puissances » (professionnel).
3. **Saisie des besoins.**
  - Particulier : il ouvre une catégorie, choisit un appareil illustré, indique la quantité. Les heures d'usage sont pré-remplies et modifiables. Un récapitulatif latéral affiche en direct le nombre d'appareils et la consommation estimée en kWh par jour.
  - Professionnel : il remplit un tableau appareil, puissance (W), quantité, heures par jour, ou saisit directement la puissance totale (W) et l'énergie journalière (Wh/j).

4. **Autonomie.** Il choisit un palier : une nuit (0,5 jour), 1 jour, 1,5 jour, 2 jours ou 3 jours.
5. **Résultat.** La proposition s'affiche avec deux variantes côte à côte : le palier d'autonomie inférieur et le palier supérieur, avec l'écart de matériel.
6. **Configurateur.** Des boutons ‹ › font avancer ou reculer l'onduleur, le stockage et le champ solaire d'une taille standard. L'autonomie réelle, la couverture solaire et les alertes se recalculent à chaque clic.
7. **Récapitulatif final.** Nomenclature complète, schéma de câblage simple, avertissement saison des pluies, export PDF et partage par lien.

<!-- embed -->

Le particulier et le professionnel suivent le même chemin ; seule la saisie des besoins change, et le configurateur renvoie au résultat à chaque clic.


## Exigences fonctionnelles

23 exigences, dont 16 indispensables pour le MVP. La colonne Priorité se modifie directement dans le tableau.

| ID | Module | Exigence | Priorité |
|---|---|---|---|
| RF-01 | Localisation | Choisir le pays puis la région ; l'ensoleillement moyen annuel de la région alimente le calcul. | [Indispensable] |
| RF-02 | Particulier | Choisir les appareils par catégorie dans des listes déroulantes, chacun illustré par une icône, et saisir la quantité. | [Indispensable] |
| RF-03 | Particulier | Pré-remplir les heures d'usage par jour de chaque appareil, modifiables. | [Indispensable] |
| RF-04 | Particulier | Afficher en direct le récapitulatif : appareils ajoutés et consommation estimée (kWh/j). | [Indispensable] |
| RF-05 | Particulier | Calculer une fourchette min–max et proposer le dimensionnement médian. | [Indispensable] |
| RF-06 | Particulier | Ajouter un appareil absent du catalogue (« Autre appareil »), avec sa puissance si elle est connue. | [Important] |
| RF-07 | Professionnel | Saisir chaque appareil avec puissance exacte (W), quantité, heures par jour et facteur de démarrage optionnel. | [Indispensable] |
| RF-08 | Professionnel | Saisir directement la puissance totale (W) et l'énergie journalière (Wh/j). | [Indispensable] |
| RF-09 | Professionnel | Choisir la technologie de batterie, la tension système (automatique par défaut), le type d'onduleur (hybride ou séparé) et les longueurs de câbles. | [Important] |
| RF-10 | Professionnel | Appliquer un coefficient de simultanéité, pour ne pas compter tous les appareils allumés en même temps. | [Important] |
| RF-11 | Résultat | Choisir l'autonomie parmi des paliers. | [Indispensable] |
| RF-12 | Résultat | Afficher la proposition et les variantes d'autonomie inférieure et supérieure. | [Indispensable] |
| RF-13 | Résultat | Configurateur : avancer ou reculer onduleur, stockage et champ solaire par taille standard, avec recalcul instantané. | [Indispensable] |
| RF-14 | Résultat | Alerter quand un choix devient insuffisant : onduleur sous la pointe, autonomie sous 0,5 jour, couverture solaire sous 100 %. | [Indispensable] |
| RF-15 | Résultat | Produire la nomenclature : panneaux, régulateur, batteries, onduleur, câbles, protections, avec quantités et câblage série/parallèle. | [Indispensable] |
| RF-16 | Résultat | Afficher l'avertissement saison des pluies (production réduite de 20 à 30 %). | [Indispensable] |
| RF-17 | Résultat | Exporter le résultat en PDF et le partager par lien. | [Important] |
| RF-18 | Résultat | Demander à être recontacté pour un devis. | [Souhaitable] |
| RF-19 | Administration | Gérer le catalogue d'appareils : ajout, modification, désactivation, illustrations. | [Indispensable] |
| RF-20 | Administration | Gérer pays, régions et ensoleillement. | [Indispensable] |
| RF-21 | Administration | Gérer le matériel de référence et les paramètres de calcul, versionnés. | [Indispensable] |
| RF-22 | Administration | Gérer les comptes administrateurs et leurs rôles. | [Important] |
| RF-23 | Administration | Consulter les statistiques : nombre de simulations, régions, appareils les plus choisis. | [Souhaitable] |


## Catalogue d'appareils initial

Le catalogue de lancement compte 36 appareils en 8 catégories, dont des appareils de terrain (congélateur de bar, tondeuse de coiffure, sono). Les valeurs sont indicatives : l'administrateur les ajuste et ajoute de nouveaux appareils.

Le taux de fonctionnement tient compte des compresseurs, qui tournent par cycles. Le facteur de démarrage est le pic au démarrage d'un moteur, exprimé en multiple de sa puissance.

| Catégorie | Appareil | Puissance min–max (W) | Heures/jour par défaut | Taux de fonctionnement | Facteur de démarrage |
|---|---|---|---|---|---|
| Éclairage | Ampoule LED | 5–15 | 6 | 1 | 1 |
| Éclairage | Ampoule fluocompacte (économique) | 11–25 | 6 | 1 | 1 |
| Éclairage | Ampoule incandescente | 40–100 | 6 | 1 | 1 |
| Éclairage | Tube LED | 9–22 | 8 | 1 | 1 |
| Éclairage | Tube néon 1,20 m | 18–40 | 8 | 1 | 1 |
| Éclairage | Projecteur extérieur LED | 20–100 | 10 | 1 | 1 |
| Froid | Réfrigérateur | 80–200 | 24 | 0,4 | 4 |
| Froid | Réfrigérateur-congélateur combiné | 120–250 | 24 | 0,45 | 4 |
| Froid | Congélateur coffre domestique | 100–250 | 24 | 0,5 | 4 |
| Froid | Congélateur de bar / vitrine réfrigérée | 200–450 | 24 | 0,6 | 4 |
| Froid | Fontaine à eau fraîche | 80–120 | 24 | 0,4 | 3 |
| Froid | Climatiseur split 1 CV | 750–1 000 | 6 | 0,7 | 3 |
| Froid | Climatiseur split 1,5 CV | 1 100–1 400 | 6 | 0,7 | 3 |
| Froid | Climatiseur split 2 CV | 1 500–2 000 | 6 | 0,7 | 3 |
| Ventilation | Ventilateur (pied, plafond, mural) | 45–75 | 8 | 1 | 1,5 |
| Audiovisuel | Télévision 32 pouces | 30–60 | 5 | 1 | 1 |
| Audiovisuel | Télévision 43 à 55 pouces | 60–150 | 5 | 1 | 1 |
| Audiovisuel | Décodeur TV | 10–25 | 5 | 1 | 1 |
| Audiovisuel | Chaîne hi-fi / home cinéma | 30–150 | 3 | 1 | 1 |
| Audiovisuel | Sono / enceinte de bar | 100–500 | 6 | 1 | 1 |
| Bureautique | Ordinateur portable | 45–90 | 6 | 1 | 1 |
| Bureautique | Ordinateur de bureau avec écran | 150–300 | 6 | 1 | 1 |
| Bureautique | Imprimante laser | 300–600 | 0,3 | 1 | 1 |
| Bureautique | Box internet / routeur Wi-Fi | 8–15 | 24 | 1 | 1 |
| Bureautique | Chargeur de téléphone | 5–20 | 3 | 1 | 1 |
| Bureautique | Caméras de surveillance et enregistreur | 10–40 | 24 | 1 | 1 |
| Électroménager | Fer à repasser | 1 000–2 200 | 0,5 | 0,6 | 1 |
| Électroménager | Machine à laver | 500–2 000 | 1 | 0,6 | 3 |
| Électroménager | Mixeur / blender | 300–800 | 0,2 | 1 | 2 |
| Électroménager | Micro-ondes | 800–1 500 | 0,3 | 1 | 1,5 |
| Électroménager | Bouilloire électrique | 1 500–2 200 | 0,2 | 1 | 1 |
| Électroménager | Chauffe-eau électrique | 1 500–3 000 | 2 | 0,7 | 1 |
| Pompage | Pompe de surface 0,5 CV | 370–750 | 1 | 1 | 3 |
| Pompage | Pompe immergée 1 CV | 750–1 100 | 2 | 1 | 3 |
| Coiffure et commerce | Tondeuse de coiffure | 10–25 | 8 | 1 | 1 |
| Coiffure et commerce | Sèche-cheveux / casque séchoir | 1 000–2 000 | 2 | 1 | 1 |

Les appareils de plus de 1 500 W (fer, bouilloire, chauffe-eau, climatiseur 2 CV) déclenchent un message : ils pèsent lourd sur l'onduleur et le stockage, et le système propose de les retirer pour comparer.


## Back-office administrateur

L'administrateur fait vivre l'outil sans développeur : chaque donnée qui influence le calcul est modifiable dans le back-office.

| Élément géré | Ce que l'administrateur renseigne |
|---|---|
| Catégories d'appareils | Nom, icône, ordre d'affichage |
| Appareils | Nom, catégorie, icône (SVG), image réaliste (WebP), puissance min, typique et max (W), heures par défaut, taux de fonctionnement, facteur de démarrage, actif ou non, ordre |
| Pays et régions | Nom, chef-lieu, coordonnées, ensoleillement moyen annuel (kWh/m²/j), valeur du mois le plus défavorable, source de la donnée |
| Matériel de référence | Panneaux, batteries, onduleurs, régulateurs, sections de câbles, protections, avec leurs caractéristiques techniques |
| Paramètres de calcul | Profondeurs de décharge, rendements, marges, paliers d'autonomie, seuils de tension ; chaque modification crée une nouvelle version |
| Comptes | Administrateurs et éditeurs du catalogue, avec leurs rôles |
| Journal | Qui a modifié quoi et quand |

Un appareil ajouté est visible tout de suite dans les listes déroulantes. Un appareil désactivé disparaît des listes mais reste lisible dans les anciennes simulations.


## Exigences non fonctionnelles et design

L'outil doit être professionnel et rapide sur un smartphone d'entrée de gamme, même avec un réseau faible.

| Exigence | Cible |
|---|---|
| Mobile d'abord | Parcours complet utilisable sur un écran de 360 px de large |
| Réseau faible | Première page sous 1 Mo, parcours fluide en 3G |
| Hors-ligne | Après la première visite, simulation possible sans connexion |
| Réactivité | Recalcul affiché en moins de 100 ms après chaque action |
| Langue | Français au lancement, anglais prévu (régions anglophones du Cameroun) |
| Unités | W, Wh, kWh, Wc, Ah, V, mm² ; FCFA quand les prix arriveront |
| Accessibilité | Contrastes conformes WCAG AA, zones tactiles d'au moins 44 px |
| Disponibilité | 99,5 % par mois |

**Principes de design**

- Un seul jeu d'icônes cohérent : même style, même épaisseur de trait. L'image réaliste n'apparaît que dans la fiche détaillée d'un appareil.
- Palette sobre : fond clair, gris neutres, jaune solaire en accent. Vert, orange et rouge sont réservés aux alertes.
- Une action principale par écran, un vocabulaire simple côté particulier (« stockage » plutôt que « capacité en Ah »), un vocabulaire technique côté professionnel.
- Résultats en cartes, une par équipement, avec le chiffre clé en grand et le détail dépliable.


## Indicateurs de succès et feuille de route

Le premier indicateur à surveiller est la justesse du calcul face aux installations réelles ; sans elle, rien d'autre ne compte. Les cibles sont des propositions à valider.

| Indicateur | Cible proposée |
|---|---|
| Écart entre le simulateur et 10 installations réelles de référence | Moins de 15 % sur la puissance crête et le stockage |
| Simulations menées jusqu'au résultat | Au moins 60 % des simulations commencées |
| Durée d'une simulation particulier | Moins de 5 minutes |
| Utilisation des variantes ou du configurateur | Suivi, sans cible au lancement |

**Feuille de route**

1. **Données.** Valider l'ensoleillement de chaque région (PVGIS, NASA POWER), le catalogue d'appareils et le matériel de référence avec un installateur.
2. **MVP.** Tout le périmètre décrit plus haut, testé sur les 10 installations de référence.
3. **Version 2.** Prix en FCFA et devis, comptes professionnels avec historique, version anglaise.
4. **Version 3.** Saisie des équipements par photo ou vidéo, systèmes hybrides rechargés par le réseau.


## Questions ouvertes

Sept décisions restent à prendre avant le développement ; les deux premières changent directement le calcul.

- Autonomie : la présenter en jours (paliers de 0,5 à 3 jours) ou en heures pour le particulier (« tenir toute la nuit ») ?
- Technologie de batterie par défaut : lithium ou plomb/gel ? Afficher les deux côte à côte ?
- Modèle économique : outil gratuit pour attirer des clients, abonnement professionnel, ou mise en relation avec un vendeur ou un installateur ?
- Matériel proposé : tailles standard génériques, ou produits et marques précis d'un fournisseur ?
- Délestages : proposer dès le MVP un système de secours rechargé par le réseau ENEO ou SEEG ?
- Simultanéité : laisser aussi le particulier indiquer les appareils qui ne fonctionnent jamais en même temps, pour réduire l'onduleur ?
- Compte professionnel : nécessaire dès le MVP ou en version 2 ?
- Plateforme : décidé, application web responsive, mobile d'abord, hébergée sur Vercel.


# Partie 2 — Technical Requirements Document (TRD)


## Architecture et stack

Une application web Angular et une API NestJS partagent le même moteur de calcul en TypeScript. Le calcul tourne dans le navigateur, ce qui rend le configurateur instantané et utilisable hors-ligne ; l'API le rejoue pour enregistrer chaque simulation.

<!-- embed -->

L'application n'appelle l'API que pour charger le catalogue et enregistrer les simulations ; le calcul se fait sur place, ce qui permet de simuler hors-ligne.

| Couche | Technologie | Rôle |
|---|---|---|
| Application web | Angular 18+ (composants standalone, signals), Tailwind CSS, Angular CDK, hébergée sur Vercel | Parcours particulier et professionnel, configurateur, back-office chargé à la demande |
| Moteur de calcul | Bibliothèque TypeScript pure, sans dépendance | Calcul identique dans le navigateur et sur le serveur |
| API | NestJS sur Vercel (une seule fonction, Fluid compute), Prisma | Catalogue, simulations, administration |
| Base de données | Neon (PostgreSQL serverless), région Europe – Francfort, via l'intégration Vercel | Données de référence et simulations |
| Médias | Vercel Blob | Icônes SVG, images WebP |
| Hors-ligne | Service worker Angular, IndexedDB | Cache du catalogue, simulations en attente d'envoi |
| PDF | pdfmake, côté navigateur | Export du résultat, même sans connexion |
| Hébergement | Vercel (web et API), Neon, GitHub | Déploiement continu, prévisualisation par branche |

Le code vit dans un monorepo Nx : `apps/web`, `apps/api`, `libs/engine`, `libs/shared-types`.

**Pourquoi Angular plutôt que Flutter.** Le moteur s'écrit une seule fois en TypeScript et sert au navigateur comme au serveur. Une application mobile ultérieure en Ionic réutilisera le même front Angular.


## Moteur de calcul

Le moteur enchaîne neuf étapes, de la consommation journalière aux protections. Chaque paramètre a une valeur par défaut modifiable par l'administrateur, et chaque simulation garde la version du moteur et des paramètres pour être recalculée à l'identique.


### Paramètres par défaut

| Paramètre | Symbole | Valeur par défaut |
|---|---|---|
| Profondeur de décharge, lithium (LiFePO4) | DoD | 0,80 |
| Profondeur de décharge, plomb / gel | DoD | 0,50 |
| Rendement de l'onduleur | η | 0,90 |
| Coefficient de pertes du champ solaire | PR | 0,70 |
| Marge sur la puissance de l'onduleur | — | 1,25 |
| Capacité de surcharge de l'onduleur, quelques secondes | f_s | 2 |
| Marge sur le régulateur et les protections | — | 1,25 |
| Chute de tension maximale | ε | 3 % |
| Résistivité du cuivre en service | ρ | 0,0225 Ω·mm²/m |
| Paliers d'autonomie | A | 0,5 · 1 · 1,5 · 2 · 3 jours |
| Longueurs de câbles par défaut | L | 15 m panneaux → régulateur, 2 m régulateur → batteries, 2 m batteries → onduleur, 5 m onduleur → tableau |


### 1. Énergie journalière

```
E_j = \sum_i q_i \times P_i \times h_i \times \tau_i
```

q est la quantité, P la puissance (W), h les heures par jour, τ le taux de fonctionnement. En mode particulier, le moteur tourne trois fois, avec P_min, P_typ et P_max, et obtient E_min, E_typ et E_max. P_typ vaut (P_min + P_max) / 2 si l'administrateur ne la renseigne pas. En mode puissance totale, E_j est saisi directement.


### 2. Puissance de pointe

```
P_{inst} = c_s \times \sum_i q_i \times P_i \qquad P_{dem} = P_{inst} + \max_i \big( (k_i - 1) \times P_i \big)
```

c_s est le coefficient de simultanéité (1 par défaut), k le facteur de démarrage. En mode puissance totale, P_inst est la puissance saisie et P_dem = P_inst × un facteur global (1 par défaut).


### 3. Tension système

Elle est choisie avant l'onduleur, à partir de 1,25 × P_inst et de la puissance crête requise P_PV (étape 5). Le professionnel peut l'imposer.

- 12 V si 1,25 × P_inst ≤ 1 200 W et P_PV ≤ 1 000 Wc.
- 24 V si 1,25 × P_inst ≤ 3 000 W et P_PV ≤ 2 500 Wc.
- 48 V au-delà.


### 4. Onduleur

Le moteur retient le plus petit onduleur du catalogue, à la tension système, qui vérifie :

```
P_{nom} \geq 1{,}25 \times P_{inst} \quad \text{et} \quad f_s \times P_{nom} \geq P_{dem}
```


### 5. Champ solaire

```
P_{PV} = \frac{E_j}{H \times PR} \qquad N_{pan} = \left\lceil \frac{P_{PV}}{P_{pan}} \right\rceil
```

H est l'ensoleillement moyen annuel de la région, en kWh/m²/j, soit des heures équivalentes de plein soleil. P_pan est la puissance du modèle de panneau par défaut, que le professionnel peut changer. Les panneaux sont ensuite répartis en chaînes :

```
N_{s,max} = \left\lfloor \frac{V_{PV,max}}{1{,}1 \times V_{oc}} \right\rfloor \qquad N_{s,min} = \left\lceil \frac{1{,}25 \times V_{sys}}{V_{mp}} \right\rceil
```

Le moteur prend le plus grand nombre de panneaux en série N_s entre ces bornes, sans dépasser N_pan, puis N_p = ⌈N_pan / N_s⌉ chaînes en parallèle ; N_pan est arrondi à N_s × N_p. Il vérifie que N_p × I_sc × 1,25 reste sous le courant d'entrée maximal du régulateur.


### 6. Régulateur MPPT

```
I_{reg} = 1{,}25 \times \frac{N_{pan} \times P_{pan}}{V_{sys}} \qquad V_{PV,max} \geq 1{,}1 \times N_s \times V_{oc}
```

Les étapes 5 et 6 se résolvent ensemble : le moteur essaie les régulateurs du plus petit au plus grand et retient le premier pour lequel une répartition en chaînes valide existe. Avec un onduleur hybride, ce sont les caractéristiques de son MPPT intégré qui sont vérifiées.


### 7. Batteries

```
C_{Wh} = \frac{E_j \times A}{DoD \times \eta} \qquad C_{Ah} = \frac{C_{Wh}}{V_{sys}}
```

```
N_{serie} = \frac{V_{sys}}{V_{unite}} \qquad N_{par} = \left\lceil \frac{C_{Ah}}{C_{unite}} \right\rceil \qquad A_{eff} = \frac{N_{par} \times C_{unite} \times V_{sys} \times DoD \times \eta}{E_j}
```

Parmi les batteries de la technologie choisie, le moteur retient le modèle qui minimise la capacité installée, puis le nombre d'unités. A_eff est l'autonomie réellement obtenue, affichée à l'utilisateur.


### 8. Câbles

```
S = \frac{2 \times \rho \times L \times I}{\varepsilon \times U}
```

La section est arrondie à la valeur normalisée supérieure (1,5 · 2,5 · 4 · 6 · 10 · 16 · 25 · 35 · 50 · 70 · 95 mm²), puis augmentée si l'intensité admissible, lue dans une table gérée par l'administrateur, est insuffisante. Côté panneaux, le minimum est 4 mm² en câble solaire.

| Tronçon | Intensité I | Tension U |
|---|---|---|
| Panneaux → régulateur | N_p × I_sc × 1,25 | N_s × V_mp |
| Régulateur → batteries | I_reg | V_sys |
| Batteries → onduleur | 1,25 × P_nom / (V_sys × η) | V_sys |
| Onduleur → tableau | 1,25 × P_nom / 230 | 230 V |


### 9. Protections

Chaque calibre est le calibre normalisé immédiatement supérieur au courant calculé.

- Côté panneaux : sectionneur DC, parafoudre DC, fusible par chaîne dès 3 chaînes en parallèle.
- Côté batteries : fusible ou disjoncteur DC à 1,25 × I batteries → onduleur, au plus près de la batterie.
- Côté sortie : disjoncteur à 1,25 × I onduleur → tableau, différentiel 30 mA, parafoudre AC.
- Mise à la terre des cadres et des masses, une structure de fixation par panneau.


### Fourchette, variantes et configurateur

- **Fourchette.** Le moteur tourne aussi sur les valeurs min et max ; chaque équipement s'affiche en intervalle (« 3 à 5 panneaux de 450 Wc ») et la proposition repose sur les valeurs typiques.
- **Variantes.** L'étape 7 est rejouée aux paliers d'autonomie voisins ; seules les batteries changent.
- **Configurateur.** Chaque bouton ‹ › impose la taille voisine du catalogue à la place du choix automatique. Le moteur recalcule alors A_eff, les alertes et la couverture solaire :

```
C_{PV} = \frac{N_{pan} \times P_{pan} \times H \times PR}{E_j}
```


### Alertes

| Condition | Niveau | Message affiché |
|---|---|---|
| P_nom < 1,25 × P_inst, ou f_s × P_nom < P_dem | Critique | L'onduleur ne peut pas alimenter tous les appareils. |
| A_eff < 0,5 jour | Attention | Le stockage ne couvre pas une nuit. |
| C_PV < 100 % | Attention | En moyenne, les panneaux ne rechargent pas complètement les batteries. |
| Un appareil de plus de 1 500 W | Information | Cet appareil pèse lourd : comparez sans lui. |
| Toujours | Information | En saison des pluies, la production peut baisser de 20 à 30 %. |


### Interface du moteur

```
export interface SimulationInput {
  mode: 'particulier' | 'pro';
  regionId: string;
  autonomyDays: number;
  batteryTech: 'lithium' | 'plomb';
  loads?: { deviceId?: string; label: string; powerW?: number; quantity: number; hoursPerDay: number }[];
  totals?: { powerW: number; dailyEnergyWh: number; surgeFactor?: number };
  options?: { systemVoltage?: 12 | 24 | 48; inverterType?: 'hybride' | 'separe'; simultaneity?: number; cableLengthsM?: Partial<Record<CableSegment, number>> };
  overrides?: { inverterId?: string; batteryModelId?: string; batteryParallel?: number; panelModelId?: string; panelCount?: number };
}

export interface SimulationResult {
  energyWhPerDay: { min: number; typ: number; max: number };
  peakW: { installed: number; surge: number };
  systemVoltage: 12 | 24 | 48;
  pv: { panelModelId: string; count: number; series: number; strings: number; totalWp: number };
  controller?: { modelId: string; currentA: number };
  battery: { modelId: string; series: number; parallel: number; capacityWh: number };
  inverter: { modelId: string; nominalW: number };
  cables: { segment: CableSegment; currentA: number; sectionMm2: number }[];
  protections: { type: string; ratingA: number; quantity: number }[];
  effectiveAutonomyDays: number;
  pvCoverage: number;
  range?: { min: Partial<SimulationResult>; max: Partial<SimulationResult> };
  variants: { lower?: Partial<SimulationResult>; upper?: Partial<SimulationResult> };
  alerts: { level: 'critique' | 'attention' | 'info'; code: string; message: string }[];
  engineVersion: string;
  paramsVersion: number;
}
```


## Cas de test de référence

Une maison à Douala consommant 3 277 Wh par jour donne, pour 1 jour d'autonomie en lithium, 3 panneaux de 450 Wc, une batterie 24 V de 200 Ah et un onduleur de 1 000 W. Les tests unitaires du moteur doivent reproduire ces valeurs à 1 % près.

**Hypothèses.** Région Littoral, H = 4,0 kWh/m²/j (valeur indicative), lithium, autonomie 1 jour, paramètres par défaut. Panneau de référence : 450 Wc, V_oc 49,5 V, V_mp 41,5 V, I_sc 11,6 A. Catalogue : onduleurs 24 V à partir de 1 000 W, batteries lithium 24 V de 100 et 200 Ah, régulateur MPPT 80 A / 250 V.

| Appareil | Quantité | Puissance (W) | Heures/jour | Taux | Énergie (Wh/j) |
|---|---|---|---|---|---|
| Ampoule LED | 6 | 10 | 6 | 1 | 360 |
| Télévision 43 pouces | 1 | 80 | 5 | 1 | 400 |
| Décodeur TV | 1 | 15 | 5 | 1 | 75 |
| Réfrigérateur | 1 | 120 | 24 | 0,4 | 1 152 |
| Ventilateur | 2 | 60 | 8 | 1 | 960 |
| Chargeur de téléphone | 3 | 10 | 3 | 1 | 90 |
| Box internet | 1 | 10 | 24 | 1 | 240 |
| **Total** |  | **435 installés** |  |  | **3 277** |

| Étape | Calcul | Résultat attendu |
|---|---|---|
| Puissance de pointe | P_inst = 435 W ; P_dem = 435 + 3 × 120 | 435 W ; 795 W |
| Champ solaire requis | 3 277 / (4,0 × 0,7) | 1 170 Wc |
| Tension système | 1,25 × 435 = 544 W, mais P_PV > 1 000 Wc | 24 V |
| Onduleur | ≥ 544 W et 2 × P_nom ≥ 795 W | 1 000 W, 24 V |
| Panneaux | ⌈1 170 / 450⌉ | 3 × 450 Wc = 1 350 Wc, 3 en série |
| Régulateur | 1,25 × 1 350 / 24 = 70,3 A ; 1,1 × 3 × 49,5 = 163 V | MPPT 80 A / 250 V |
| Batteries | 3 277 / (0,8 × 0,9) = 4 551 Wh, soit 190 Ah | 1 × 24 V 200 Ah |
| Autonomie effective | 200 × 24 × 0,72 / 3 277 | 1,05 jour |
| Couverture solaire | 1 350 × 4,0 × 0,7 / 3 277 | 115 % |
| Câble panneaux → régulateur | I = 14,5 A, U = 124,5 V, L = 15 m → 2,6 mm² | 4 mm² (minimum câble solaire) |
| Câble régulateur → batteries | I = 70,3 A, U = 24 V, L = 2 m → 8,8 mm² | 10 mm², puis contrôle de l'intensité admissible |
| Câble batteries → onduleur | I = 57,9 A, U = 24 V, L = 2 m → 7,2 mm² | 10 mm², puis contrôle de l'intensité admissible |
| Protection batterie | 1,25 × 1 000 / (24 × 0,9) = 57,9 A | Fusible 63 A |

**Variantes attendues.** Palier inférieur, 0,5 jour : 95 Ah requis, 1 × 100 Ah, autonomie effective 0,53 jour. Palier supérieur, 1,5 jour : 284 Ah requis, 3 × 100 Ah, autonomie effective 1,58 jour. Panneaux, régulateur et onduleur restent identiques.

Trois autres cas sont à écrire avant le développement : un système 48 V avec climatiseur, un cas professionnel en puissance totale, et un cas plomb/gel.


## Modèle de données

Quatorze tables PostgreSQL, hébergées sur Neon : les données de référence que gère l'administrateur, et les simulations, qui stockent leurs entrées et résultats en JSONB avec la version du moteur.

| Table | Champs principaux |
|---|---|
| country | id, code ISO, nom, tension réseau (V), ordre |
| region | id, country_id, nom, chef_lieu, latitude, longitude, irradiation_moy (kWh/m²/j), irradiation_min_mois, source, maj_le |
| device_category | id, nom, icone_url, ordre |
| device | id, category_id, nom, icone_url, image_url, p_min_w, p_typ_w, p_max_w, heures_defaut, taux_fonctionnement, facteur_demarrage, actif, ordre |
| panel_model | id, libelle, p_wc, voc_v, vmp_v, isc_a, imp_a, actif, par_defaut |
| battery_model | id, technologie, v_nom, c_ah, dod, actif |
| inverter_model | id, type (hybride, autonome), p_nom_w, facteur_surcharge, v_dc, rendement, mppt_i_max_a, mppt_v_pv_max, actif |
| controller_model | id, type (MPPT, PWM), i_max_a, v_pv_max, i_entree_max_a, tensions_supportees, actif |
| cable_section | section_mm2, i_admissible_a |
| protection_rating | type, calibre_a |
| parameter_set | id, version, valeurs (JSONB), actif_depuis, cree_par |
| simulation | id (UUID), mode, region_id, autonomie_j, techno_batterie, entrees, forcages, resultat (JSONB), engine_version, params_version, share_token, cree_le |
| admin_user | id, email, mot_de_passe_hash, role (ADMIN, EDITEUR), actif, derniere_connexion |
| audit_log | id, admin_user_id, entite, entite_id, action, avant, apres (JSONB), cree_le |


### Données initiales des régions

Ces valeurs d'ensoleillement sont approximatives : elles doivent être remplacées par les moyennes annuelles PVGIS ou NASA POWER de chaque chef-lieu avant la mise en production.

| Pays | Région | Chef-lieu | Ensoleillement indicatif (kWh/m²/j) |
|---|---|---|---|
| Cameroun | Extrême-Nord | Maroua | 5,8 |
| Cameroun | Nord | Garoua | 5,6 |
| Cameroun | Adamaoua | Ngaoundéré | 5,2 |
| Cameroun | Nord-Ouest | Bamenda | 4,8 |
| Cameroun | Ouest | Bafoussam | 4,7 |
| Cameroun | Est | Bertoua | 4,6 |
| Cameroun | Centre | Yaoundé | 4,5 |
| Cameroun | Sud | Ebolowa | 4,3 |
| Cameroun | Littoral | Douala | 4,0 |
| Cameroun | Sud-Ouest | Buea | 4,0 |
| Gabon | Haut-Ogooué | Franceville | 4,4 |
| Gabon | Woleu-Ntem | Oyem | 4,3 |
| Gabon | Ngounié | Mouila | 4,2 |
| Gabon | Nyanga | Tchibanga | 4,2 |
| Gabon | Ogooué-Ivindo | Makokou | 4,2 |
| Gabon | Ogooué-Lolo | Koulamoutou | 4,2 |
| Gabon | Moyen-Ogooué | Lambaréné | 4,1 |
| Gabon | Ogooué-Maritime | Port-Gentil | 4,1 |
| Gabon | Estuaire | Libreville | 4,0 |


## API REST

L'API publique sert le catalogue en un seul appel et enregistre les simulations ; tout le reste est réservé au back-office, derrière une authentification JWT. Toutes les routes sont préfixées par `/api/v1`.

| Méthode | Route | Rôle | Accès |
|---|---|---|---|
| GET | `/countries` | Pays, régions et ensoleillement | Public |
| GET | `/catalog` | Catégories, appareils, matériel et paramètres actifs, avec ETag pour le cache hors-ligne | Public |
| POST | `/simulations` | Enregistre une simulation ; le serveur rejoue le moteur et refuse un résultat divergent | Public, limité en débit |
| GET | `/simulations/:shareToken` | Ouvre une simulation partagée par lien | Public |
| POST | `/leads` | Demande de devis ou de rappel | Public, limité en débit |
| POST | `/auth/login`, `/auth/refresh` | Connexion et renouvellement de session | Public |
| GET, POST, PATCH, DELETE | `/admin/device-categories`, `/admin/devices` | Gestion des catégories et des appareils | ADMIN, EDITEUR |
| POST | `/admin/media` | Téléversement d'une icône ou d'une image | ADMIN, EDITEUR |
| GET, POST, PATCH | `/admin/countries`, `/admin/regions` | Gestion des pays, régions, ensoleillement | ADMIN |
| GET, POST, PATCH | `/admin/equipment/{panels, batteries, inverters, controllers}` | Gestion du matériel de référence | ADMIN |
| GET, POST | `/admin/parameter-sets`, `/admin/parameter-sets/:id/activate` | Nouvelle version des paramètres, activation | ADMIN |
| GET | `/admin/stats/simulations` | Statistiques d'usage | ADMIN |
| GET | `/admin/audit-log` | Journal des modifications | ADMIN |

Les entrées sont validées par des DTO (class-validator). Les erreurs suivent un format unique : code, message en français, champ concerné.


## Front-end, hors-ligne et médias

Chaque action de l'utilisateur met à jour un état réactif qui relance le moteur localement : aucun aller-retour serveur n'est nécessaire pour simuler.

**Écrans et routes**

| Route | Écran |
|---|---|
| `/` | Choix du pays et de la région |
| `/mode` | Choix particulier ou professionnel |
| `/besoins` | Listes d'appareils par catégorie (particulier) ou tableau de saisie (professionnel), récapitulatif latéral |
| `/autonomie` | Paliers d'autonomie, technologie de batterie |
| `/resultat` | Proposition et deux variantes côte à côte |
| `/configurateur` | Boutons ‹ › sur onduleur, stockage et panneaux, alertes en direct |
| `/s/:shareToken` | Simulation partagée, en lecture |
| `/admin/**` | Back-office, chargé à la demande, protégé par un garde de route |

**État et calcul.** Un store à base de signals contient la région, les appareils, l'autonomie et les forçages du configurateur. Le résultat est un `computed` qui appelle le moteur ; la saisie de quantités est temporisée à 150 ms.

**Hors-ligne.** Le service worker met en cache l'application et la réponse de `/catalog` (revalidation par ETag). Une simulation faite sans réseau est placée dans une file IndexedDB et envoyée au retour de la connexion.

**Médias.**

- Icônes : un seul jeu SVG au trait, grille 24 px, trait 1,5 px, couleur héritée du thème. Les SVG téléversés sont nettoyés (svgo et DOMPurify).
- Images réalistes : WebP 512 × 512 px, fond neutre, 80 Ko maximum après conversion automatique (sharp). Téléversement refusé au-delà de 2 Mo ou si le type réel n'est pas une image.
- Fichiers stockés dans Vercel Blob, aux noms hachés, servis par le CDN avec un cache long.

**Design system.** Couleurs, typographie et espacements sont définis comme jetons Tailwind : fond clair, gris neutres, jaune solaire en accent, trois couleurs d'alerte.

**Export PDF.** pdfmake génère côté navigateur un document avec logo, région, hypothèses, nomenclature, schéma de câblage simplifié et avertissement saison des pluies.


## Sécurité, déploiement et tests

Le risque principal n'est pas technique mais métier : un calcul faux. Les tests du moteur sur des cas chiffrés et la comparaison avec de vraies installations passent avant tout le reste.

**Sécurité**

- Back-office : jeton d'accès de 15 minutes, jeton de renouvellement en cookie httpOnly, mots de passe hachés en argon2, rôles ADMIN et EDITEUR, verrouillage après 5 échecs.
- API : limitation de débit sur les routes publiques par les règles du pare-feu Vercel (un compteur en mémoire ne tient pas entre instances serverless), validation stricte, CORS restreint au domaine, en-têtes de sécurité (Helmet), HTTPS partout.
- Téléversements : contrôle du type réel du fichier, nettoyage des SVG contre l'injection de script.
- Données personnelles : aucune hors du formulaire de devis, avec consentement explicite ; adresses IP non conservées en clair.

**Déploiement**

- **Vercel.** Deux projets depuis le même monorepo : `web` (Angular) et `api` (NestJS). Le projet web redirige `/api/*` vers l'API, ce qui évite les problèmes de CORS.
- **NestJS** est détecté sans configuration et tourne comme une seule fonction Vercel (Fluid compute), limitée à 250 Mo : garder les dépendances légères.
- **Neon** via l'intégration Vercel, en région Europe (Francfort), avec les fonctions Vercel dans la même région. `DATABASE_URL` (connexion poolée) sert à l'application, `DATABASE_URL_UNPOOLED` (connexion directe) aux migrations Prisma (`directUrl`).
- **Mise en veille.** Neon s'arrête après une période d'inactivité ; la première requête suivante est plus lente. Le calcul tournant dans le navigateur, l'utilisateur ne le ressent pas.
- **Prévisualisations.** Chaque branche Git obtient un déploiement Vercel et sa propre branche de base Neon, créée automatiquement.
- **Sauvegardes.** Restauration à un instant donné de Neon (durée selon le plan), plus un export pg_dump hebdomadaire par GitHub Actions, conservé hors de Neon.
- **Mise en production.** Push sur `main` → production ; GitHub Actions lance lint et tests avant chaque déploiement.
- **Suivi.** Observabilité Vercel côté API, suivi des erreurs côté navigateur.

**Tests**

- Moteur : tests unitaires sur le cas de Douala et les trois cas à écrire, tolérance de 1 %, couverture d'au moins 90 %.
- Validation métier : comparer le simulateur à 10 installations réelles avant le lancement.
- API : tests de bout en bout avec Supertest.
- Front : tests de composants, et parcours complets avec Playwright sur un écran de 360 px et un réseau 3G simulé.


/* Banque de questions du « Quiz du jour ».
   La première option est toujours la bonne réponse ; l’ordre affiché est mélangé chaque jour. */

export type QuizQuestion = {
  category: "Culture générale" | "Madagascar" | "Comores" | "Sciences" | "Langue française" | "Logique";
  question: string;
  options: [string, string, string, string];
};

export const QUIZ_BANK: QuizQuestion[] = [
  // Madagascar
  { category: "Madagascar", question: "Quelle est la capitale de Madagascar ?", options: ["Antananarivo", "Toamasina", "Mahajanga", "Fianarantsoa"] },
  { category: "Madagascar", question: "Quel est le nom malgache officiel de la ville de Tuléar ?", options: ["Toliara", "Toamasina", "Taolagnaro", "Antsiranana"] },
  { category: "Madagascar", question: "Sur quelle côte de Madagascar se trouve Tuléar ?", options: ["Sud-ouest", "Nord-est", "Est", "Nord"] },
  { category: "Madagascar", question: "Quel bras de mer sépare Madagascar du continent africain ?", options: ["Le canal du Mozambique", "La mer Rouge", "Le golfe d’Aden", "Le détroit de Gibraltar"] },
  { category: "Madagascar", question: "Quelle est la monnaie de Madagascar ?", options: ["L’ariary", "Le franc CFA", "Le shilling", "Le rand"] },
  { category: "Madagascar", question: "En quelle année Madagascar a-t-elle proclamé son indépendance ?", options: ["1960", "1945", "1975", "1958"] },
  { category: "Madagascar", question: "Quel groupe d’animaux est emblématique de la faune endémique de Madagascar ?", options: ["Les lémuriens", "Les kangourous", "Les pandas", "Les bisons"] },
  { category: "Madagascar", question: "L’Allée des baobabs se trouve près de quelle ville ?", options: ["Morondava", "Antsirabe", "Toamasina", "Ambositra"] },
  { category: "Madagascar", question: "Dans quel océan se trouve Madagascar ?", options: ["L’océan Indien", "L’océan Atlantique", "L’océan Pacifique", "L’océan Arctique"] },
  { category: "Madagascar", question: "Quel tropique passe à proximité de Tuléar ?", options: ["Le tropique du Capricorne", "Le tropique du Cancer", "L’équateur", "Le cercle polaire"] },
  { category: "Madagascar", question: "Quel parc national du sud de Madagascar est connu pour ses massifs de grès et ses canyons ?", options: ["L’Isalo", "Le Serengeti", "Le Kruger", "Le Virunga"] },
  { category: "Madagascar", question: "Quel est le point culminant de Madagascar ?", options: ["Le Maromokotro", "Le Kilimandjaro", "Le Karthala", "Le piton des Neiges"] },
  { category: "Madagascar", question: "Quelle est la langue nationale de Madagascar ?", options: ["Le malgache", "Le swahili", "Le shikomori", "L’amharique"] },
  { category: "Madagascar", question: "Parmi les plus grandes îles du monde, quel rang occupe Madagascar ?", options: ["4e", "1re", "2e", "10e"] },
  { category: "Madagascar", question: "Quel arbre au tronc massif est un symbole des paysages de l’ouest malgache ?", options: ["Le baobab", "Le chêne", "Le séquoia", "L’érable"] },

  // Comores
  { category: "Comores", question: "Quelle est la capitale de l’Union des Comores ?", options: ["Moroni", "Mutsamudu", "Fomboni", "Mamoudzou"] },
  { category: "Comores", question: "Sur quelle île se trouve Moroni ?", options: ["Grande Comore (Ngazidja)", "Anjouan (Ndzuani)", "Mohéli (Mwali)", "Mayotte (Maoré)"] },
  { category: "Comores", question: "Quel est le chef-lieu de l’île d’Anjouan ?", options: ["Mutsamudu", "Moroni", "Fomboni", "Domoni"] },
  { category: "Comores", question: "Quel est le nom comorien de l’île d’Anjouan ?", options: ["Ndzuani", "Ngazidja", "Mwali", "Maoré"] },
  { category: "Comores", question: "Quel est le nom comorien de l’île de Mohéli ?", options: ["Mwali", "Ndzuani", "Ngazidja", "Maoré"] },
  { category: "Comores", question: "Combien d’îles composent l’Union des Comores ?", options: ["3", "4", "2", "5"] },
  { category: "Comores", question: "Comment s’appelle la langue comorienne ?", options: ["Le shikomori", "Le malgache", "Le wolof", "Le lingala"] },
  { category: "Comores", question: "En quelle année les Comores ont-elles proclamé leur indépendance ?", options: ["1975", "1960", "1962", "1990"] },
  { category: "Comores", question: "Quelle est la monnaie des Comores ?", options: ["Le franc comorien", "L’ariary", "L’euro", "La roupie"] },
  { category: "Comores", question: "Quel volcan actif se trouve sur la Grande Comore ?", options: ["Le Karthala", "L’Etna", "Le Kilimandjaro", "Le Vésuve"] },
  { category: "Comores", question: "Quelle île de l’archipel des Comores est administrée par la France ?", options: ["Mayotte", "Anjouan", "Mohéli", "Grande Comore"] },
  { category: "Comores", question: "Les Comores sont un grand producteur de quelle fleur utilisée en parfumerie ?", options: ["L’ylang-ylang", "La tulipe", "Le lilas", "L’edelweiss"] },
  { category: "Comores", question: "Quelle variante du shikomori est parlée à Anjouan ?", options: ["Le shindzuani", "Le shingazidja", "Le shimwali", "Le shimaoré"] },
  { category: "Comores", question: "Lesquelles sont les langues officielles de l’Union des Comores ?", options: ["Comorien, français et arabe", "Français et anglais", "Arabe et swahili", "Comorien et portugais"] },
  { category: "Comores", question: "L’archipel des Comores se situe à l’entrée nord de quel bras de mer ?", options: ["Le canal du Mozambique", "La mer Rouge", "Le golfe Persique", "La Manche"] },

  // Culture générale
  { category: "Culture générale", question: "Quel est le plus long fleuve d’Afrique ?", options: ["Le Nil", "Le Congo", "Le Niger", "Le Zambèze"] },
  { category: "Culture générale", question: "Quel est le plus grand océan du monde ?", options: ["Le Pacifique", "L’Atlantique", "L’Indien", "L’Arctique"] },
  { category: "Culture générale", question: "Quel est le plus haut sommet d’Afrique ?", options: ["Le Kilimandjaro", "Le mont Kenya", "Le Ruwenzori", "Le Toubkal"] },
  { category: "Culture générale", question: "Quelle est la capitale du Kenya ?", options: ["Nairobi", "Mombasa", "Kampala", "Dodoma"] },
  { category: "Culture générale", question: "Quelle est la capitale du Mozambique ?", options: ["Maputo", "Beira", "Lusaka", "Harare"] },
  { category: "Culture générale", question: "Quelle est la capitale du Sénégal ?", options: ["Dakar", "Bamako", "Abidjan", "Conakry"] },
  { category: "Culture générale", question: "Dans quelle ville se trouve le siège de l’Union africaine ?", options: ["Addis-Abeba", "Nairobi", "Le Caire", "Johannesburg"] },
  { category: "Culture générale", question: "Qui a écrit « Les Misérables » ?", options: ["Victor Hugo", "Émile Zola", "Molière", "Albert Camus"] },
  { category: "Culture générale", question: "Qui a écrit « Le Petit Prince » ?", options: ["Antoine de Saint-Exupéry", "Jules Verne", "Jean de La Fontaine", "Marcel Proust"] },
  { category: "Culture générale", question: "Qui a peint « La Joconde » ?", options: ["Léonard de Vinci", "Pablo Picasso", "Claude Monet", "Vincent van Gogh"] },
  { category: "Culture générale", question: "En quelle année l’être humain a-t-il marché sur la Lune pour la première fois ?", options: ["1969", "1957", "1975", "1981"] },
  { category: "Culture générale", question: "Quelle langue est principalement parlée au Brésil ?", options: ["Le portugais", "L’espagnol", "Le français", "L’italien"] },
  { category: "Culture générale", question: "Nelson Mandela a été président de quel pays ?", options: ["L’Afrique du Sud", "Le Kenya", "Le Nigeria", "La Tanzanie"] },
  { category: "Culture générale", question: "Quel est le plus grand désert chaud du monde ?", options: ["Le Sahara", "Le Kalahari", "Le désert de Gobi", "Le Namib"] },
  { category: "Culture générale", question: "Quel est le pays le plus peuplé d’Afrique ?", options: ["Le Nigeria", "L’Égypte", "L’Éthiopie", "L’Afrique du Sud"] },

  // Sciences
  { category: "Sciences", question: "Quelle est la formule chimique de l’eau ?", options: ["H₂O", "CO₂", "O₂", "NaCl"] },
  { category: "Sciences", question: "Quel élément chimique a pour symbole Na ?", options: ["Le sodium", "L’azote", "Le néon", "Le nickel"] },
  { category: "Sciences", question: "Quel élément chimique a pour symbole Fe ?", options: ["Le fer", "Le fluor", "Le francium", "Le phosphore"] },
  { category: "Sciences", question: "Quelle est la planète la plus proche du Soleil ?", options: ["Mercure", "Vénus", "Mars", "La Terre"] },
  { category: "Sciences", question: "Quelle est la plus grande planète du Système solaire ?", options: ["Jupiter", "Saturne", "Neptune", "La Terre"] },
  { category: "Sciences", question: "Quel gaz les plantes absorbent-elles lors de la photosynthèse ?", options: ["Le dioxyde de carbone", "L’oxygène", "L’azote", "L’hélium"] },
  { category: "Sciences", question: "Combien d’os compte le squelette d’un adulte ?", options: ["206", "180", "250", "312"] },
  { category: "Sciences", question: "Quel organe pompe le sang dans le corps humain ?", options: ["Le cœur", "Le foie", "Les poumons", "Les reins"] },
  { category: "Sciences", question: "À quelle température l’eau bout-elle au niveau de la mer ?", options: ["100 °C", "90 °C", "120 °C", "80 °C"] },
  { category: "Sciences", question: "Quelle est l’unité de mesure de la force ?", options: ["Le newton", "Le watt", "Le joule", "Le pascal"] },
  { category: "Sciences", question: "Combien de chromosomes possède une cellule humaine ordinaire ?", options: ["46", "23", "48", "64"] },
  { category: "Sciences", question: "Quel est le seul mammifère capable de vol actif ?", options: ["La chauve-souris", "L’écureuil volant", "Le colugo", "Le pingouin"] },
  { category: "Sciences", question: "Quel est le plus grand animal vivant ?", options: ["La baleine bleue", "L’éléphant d’Afrique", "Le requin-baleine", "La girafe"] },
  { category: "Sciences", question: "Quelle est la vitesse approximative de la lumière dans le vide ?", options: ["300 000 km/s", "30 000 km/s", "3 000 km/s", "3 000 000 km/s"] },
  { category: "Sciences", question: "Quel gaz est le plus abondant dans l’air que nous respirons ?", options: ["L’azote", "L’oxygène", "Le dioxyde de carbone", "L’argon"] },

  // Langue française
  { category: "Langue française", question: "Quel est le pluriel de « cheval » ?", options: ["Chevaux", "Chevals", "Chevauxs", "Chevales"] },
  { category: "Langue française", question: "Quel est le pluriel de « œil » ?", options: ["Yeux", "Œils", "Œuils", "Yeuxs"] },
  { category: "Langue française", question: "Quel mot est un antonyme de « généreux » ?", options: ["Avare", "Prodigue", "Large", "Bienveillant"] },
  { category: "Langue française", question: "Quel est le participe passé du verbe « prendre » ?", options: ["Pris", "Prendu", "Prit", "Prené"] },
  { category: "Langue française", question: "Quelle est la nature du mot « rapidement » ?", options: ["Un adverbe", "Un adjectif", "Un nom", "Un verbe"] },
  { category: "Langue française", question: "Quelle orthographe est correcte ?", options: ["Développement", "Dévelopement", "Développemment", "Dévellopement"] },
  { category: "Langue française", question: "Complétez : « Hier, elles … allées au marché. »", options: ["sont", "ont", "est", "a"] },
  { category: "Langue française", question: "Quel mot est un synonyme de « débuter » ?", options: ["Commencer", "Terminer", "Arrêter", "Reporter"] },
  { category: "Langue française", question: "Quel est le féminin de « acteur » ?", options: ["Actrice", "Acteuse", "Actrisse", "Acteure"] },
  { category: "Langue française", question: "À quel temps est conjugué « nous chanterons » ?", options: ["Futur simple", "Imparfait", "Passé simple", "Conditionnel présent"] },

  // Logique et calcul
  { category: "Logique", question: "Combien font 15 % de 200 ?", options: ["30", "15", "25", "35"] },
  { category: "Logique", question: "Quel nombre suit : 2, 4, 8, 16, … ?", options: ["32", "24", "20", "18"] },
  { category: "Logique", question: "Combien font 7 × 8 ?", options: ["56", "54", "48", "64"] },
  { category: "Logique", question: "Quelle est la racine carrée de 144 ?", options: ["12", "14", "11", "16"] },
  { category: "Logique", question: "Lequel de ces nombres est premier ?", options: ["29", "21", "27", "33"] },
  { category: "Logique", question: "Quelle est la somme des angles d’un triangle ?", options: ["180°", "90°", "360°", "270°"] },
  { category: "Logique", question: "Quel nombre suit : 1, 1, 2, 3, 5, 8, … ?", options: ["13", "11", "12", "15"] },
  { category: "Logique", question: "Si 3x + 5 = 20, combien vaut x ?", options: ["5", "15", "6", "4"] },
  { category: "Logique", question: "Combien de minutes y a-t-il dans 2 h 30 ?", options: ["150", "130", "230", "120"] },
  { category: "Logique", question: "Quel est le périmètre d’un carré de 5 cm de côté ?", options: ["20 cm", "25 cm", "10 cm", "15 cm"] },
  { category: "Logique", question: "Combien vaut 2 puissance 10 ?", options: ["1 024", "1 000", "512", "2 048"] },
  { category: "Logique", question: "Quelle est la moyenne de 4, 8 et 12 ?", options: ["8", "6", "10", "24"] },
  { category: "Logique", question: "Quelle fraction est égale à 0,25 ?", options: ["1/4", "1/2", "2/5", "1/3"] },
  { category: "Logique", question: "Un train part à 9 h 45 et roule 2 h 30. À quelle heure arrive-t-il ?", options: ["12 h 15", "11 h 75", "12 h 45", "11 h 15"] },
  { category: "Logique", question: "Quel nombre suit : 3, 6, 11, 18, 27, … ?", options: ["38", "36", "35", "40"] },
];

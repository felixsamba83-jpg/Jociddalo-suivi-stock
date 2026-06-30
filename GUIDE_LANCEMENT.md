# 🚀 Lancer ta plateforme Jociddalo aujourd'hui — Guide pas à pas

Suis ces étapes dans l'ordre. Tout est gratuit. Compte environ 20-25 minutes.

---

## ÉTAPE 1 — Créer la base de données partagée (Firebase) — 7 min

1. Va sur **https://console.firebase.google.com**
2. Connecte-toi avec un compte Google (crée-en un si besoin)
3. Clique **"Ajouter un projet"** → nomme-le `jociddalo-stock` → suis les étapes (tu peux désactiver Google Analytics, pas nécessaire)
4. Une fois le projet créé, dans le menu de gauche : **Compilation > Realtime Database**
5. Clique **"Créer une base de données"**
   - Choisis la région la plus proche (Europe ou Belgique si proposé)
   - Choisis **"Démarrer en mode test"** (accès libre pendant 30 jours — suffisant pour démarrer)
6. Une fois créée, va dans **⚙️ Paramètres du projet** (icône engrenage en haut à gauche) → **Paramètres du projet**
7. Descends jusqu'à **"Vos applications"** → clique l'icône **`</>`** (Web)
8. Donne un surnom (ex: "jociddalo-web") → **"Enregistrer l'application"**
9. Firebase t'affiche un bloc de code avec `firebaseConfig = {...}` — **copie ces valeurs**, tu en auras besoin à l'étape 3.

---

## ÉTAPE 2 — Mettre le code sur GitHub — 5 min

1. Va sur **https://github.com** et crée un compte (gratuit) si tu n'en as pas
2. Clique **"New repository"** (bouton vert)
3. Nom : `jociddalo-suivi-stock` → coche **Public** ou **Private** (peu importe) → **"Create repository"**
4. Sur la page qui s'affiche, clique **"uploading an existing file"**
5. Glisse-dépose TOUS les fichiers et dossiers de ce projet (que je t'ai préparés) dans la zone
6. En bas, clique **"Commit changes"**

---

## ÉTAPE 3 — Coller tes clés Firebase dans le code — 3 min

1. Toujours sur GitHub, ouvre le fichier `src/firebase.js`
2. Clique l'icône crayon ✏️ (Edit this file) en haut à droite
3. Remplace les valeurs `"VOTRE_API_KEY"`, `"VOTRE_PROJET"`, etc. par les vraies valeurs copiées à l'étape 1.9
4. Clique **"Commit changes"** en bas

---

## ÉTAPE 4 — Mettre en ligne avec Vercel — 5 min

1. Va sur **https://vercel.com** → **"Sign Up"** → choisis **"Continue with GitHub"** (connecte ton compte GitHub)
2. Une fois connecté, clique **"Add New..." > "Project"**
3. Trouve `jociddalo-suivi-stock` dans la liste → clique **"Import"**
4. Vercel détecte automatiquement que c'est un projet Vite/React — ne change rien
5. Clique **"Deploy"**
6. Attends 1-2 minutes ⏳ — Vercel te donne un lien du type `https://jociddalo-suivi-stock.vercel.app`

---

## ÉTAPE 5 — Partager aux gérants — 1 min

1. Copie le lien Vercel
2. Envoie-le sur WhatsApp à chaque gérant avec ce message :

> "Bonjour, voici le lien pour le contrôle de stock journalier. Cliquez, choisissez votre station, et remplissez chaque jour : [LIEN]
> Sur téléphone : ouvrez le lien, puis menu (⋮ ou partage) > 'Ajouter à l'écran d'accueil' pour l'avoir comme une appli."

3. Toi, tu ouvres le même lien, tu cliques **"Contrôleur"**, et tu entres le code : **`JOCID2026`** (modifiable dans le code, section `CONTROLEUR_CODE` du fichier `App.jsx`)

---

## ⚠️ Sécurité — à faire dans les jours qui suivent

Le mode "test" de Firebase laisse l'accès ouvert à tous pendant 30 jours. Avant l'expiration :
- Reviens dans Firebase Console > Realtime Database > Règles
- Remplace par des règles de lecture/écriture restreintes (je peux t'aider à les écrire le moment venu)

---

## En cas de blocage

Si une étape coince (erreur Vercel, erreur Firebase, etc.), envoie-moi une capture d'écran et je te dis exactement quoi corriger.

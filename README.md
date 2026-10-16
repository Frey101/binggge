# Binggge

Application de suivi de séries développée dans le cadre de la ressource d'automatisation et de déploiement continu. Elle permet de rechercher des séries, de gérer une liste personnelle et d'assurer le suivi de visionnage.

* **Stack :** Node.js (Express), PostgreSQL 16, Docker Compose, GitHub Actions.
* **URL de production :** https://iut.cafeclaudie.fr/Frey101/health

---

## Démarrage rapide en local

### Avec Docker Compose
1. Créer le fichier `.env` :
   ```env
   DB_PASS=votre_mot_de_passe
   ```
2. Lancer les conteneurs :
   ```bash
   docker compose up -d --build
   ```
   L'API est accessible sur `http://localhost:3000`.

### Initialisation base de données
- **En local :**
  ```bash
  docker compose exec -T db psql -U postgres -d binggge < api/db/schema.sql
  ```
- **Sur le serveur distant :**
  ```bash
  cat api/db/schema.sql | sudo binggge exec -T db psql -U postgres -d binggge
  ```

### Tests
```bash
cd api
npm test
```

---

## Routes de l'API

| Méthode | Route | En-tête requis | Description |
|---|---|---|---|
| `GET` | `/health` | Aucun | Statut de l'API (`{"status":"ok"}`). |
| `GET` | `/shows?q=<nom>` | Aucun | Recherche TVMaze formatée. |
| `POST` | `/register` | Aucun | Création d'utilisateur (`{"login":"nom"}`). |
| `GET` | `/watchlist` | `X-User: <login>` | Récupère la liste (401 si absent). |
| `POST` | `/watchlist` | `X-User: <login>` | Ajout d'une série (400 si titre vide, 401 si sans header). |

*Note d'authentification :* L'en-tête `X-User` sert d'identifiant direct afin de valider les règles d'accès sans alourdir le projet avec un système complet de JWT/sessions.

---

## Pipeline CI/CD

Géré via `.github/workflows/ci.yml` :
1. **test (CI) :** démarre PostgreSQL temporaire, lance `npm ci` et `npm test`.
2. **build (CI) :** valide la création de l'image Docker.
3. **deploy (CD) :** déclenché lors du merge sur `main` (connexion SSH Ed25519, `git pull`, `sudo binggge up -d --build`).

Protection active : push direct interdit sur `main`, merge bloqué si la CI échoue.

---
<br>

# Checklist de validation — Séance 1

- **01. Dépôt accessible :** Dépôt GitHub opérationnel et accessible en écriture.
- **02. Branche protégée :** Les pushs directs sur `main` sont refusés.
- **03. MR validée :** Une Pull Request documentée a été revue et fusionnée.
- **04. Recherche opérationnelle :** `curl localhost:3000/shows?q=severance` renvoie les résultats formatés depuis TVMaze.
- **05. Suivi & documentation :** 8 tickets créés, répartis sur 3 jalons avec estimations, et un README initial rédigé.

---
<br>

# Checklist de validation — Séance 2

- **01. Tests validés :** `docker compose up -d` puis `npm test` aboutissent à 4 tests au vert.
- **02. Persistance :** Les données en watchlist sont conservées après un `docker compose down` puis `docker compose up -d` grâce au volume Docker.
- **03. Authentification expliquée :** Justification présente dans le README sur l'usage de l'en-tête `X-User` à la place d'une gestion par session/token.
- **04. Traçabilité :** Deux Pull Requests supplémentaires fusionnées avec fermeture automatique des tickets associés (`Closes #n`).

---
<br>

# Checklist de validation — Séance 3

- **01. Réponse distante :** L'URL `https://iut.cafeclaudie.fr/Frey101/health` répond bien `200 OK` depuis un navigateur externe.
- **02. Pipeline complet :** Le workflow enchaîne les tests, le build et le déploiement automatique sur le serveur distant.
- **03. Défi gestion d'incident :** Régression simulée (attente du code HTTP 201) ayant bloqué la Pull Request sans impacter la production.

![alt text](639277774704630928.png)

- **04. Sécurité des secrets :** Clé SSH et identifiant stockés dans GitHub Secrets (`SSH_DEPLOY_KEY`, `LOGIN`), variables d'environnement gérées via `.env` non versionné.
- **05. Clôture de séance :** Jalon Séance 3 fermé sur GitHub et déploiement final validé.
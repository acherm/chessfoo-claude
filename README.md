# Puzzle des Cavaliers 3x3

Un puzzle d'échecs interactif où le joueur doit échanger les positions des cavaliers blancs et noirs sur un échiquier 3x3.

**Demo en ligne : https://chessfoo-claude.vercel.app/**

## Spécification du jeu

### Configuration initiale

```
+---+---+---+
| N |   | N |   <- Cavaliers noirs (row 0)
+---+---+---+
|   |   |   |   <- Cases vides (row 1)
+---+---+---+
| B |   | B |   <- Cavaliers blancs (row 2)
+---+---+---+
```

### Objectif

Échanger les positions des cavaliers :
- Les cavaliers **blancs** doivent se retrouver en haut (row 0, coins)
- Les cavaliers **noirs** doivent se retrouver en bas (row 2, coins)

### Règles

- Les cavaliers se déplacent en "L" comme aux échecs (2 cases dans une direction + 1 case perpendiculaire)
- Un cavalier ne peut se déplacer que vers une case vide
- Sur un échiquier 3x3, les déplacements possibles sont limités

### Solution optimale

Le puzzle se résout en **16 coups minimum**.

## Fonctionnalités

### Jeu
- Interface interactive avec sélection des pièces au clic
- Affichage des coups valides (points verts)
- Compteur de coups
- Chronomètre
- Détection automatique de la victoire
- Bouton recommencer

### Persistance (Supabase)
- Enregistrement automatique de chaque session de jeu
- Sauvegarde de tous les coups avec timestamps
- Tracking du temps total et du nombre de coups
- Statut de la partie (gagnée, abandonnée, en cours)

### Historique
- Liste des parties jouées
- Statistiques globales :
  - Nombre total de parties
  - Nombre de victoires
  - Meilleur score (coups)
  - Meilleur temps

### Replay
- Visualisation coup par coup des parties passées
- Contrôles : début, précédent, lecture auto, suivant, fin
- Affichage du coup en cours (case départ en rouge, arrivée en vert)

## Stack technique

- **Frontend** : Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes (serverless)
- **Base de données** : Supabase (PostgreSQL)
- **Déploiement** : Vercel

## Schéma de base de données

### Table `game_sessions`

```sql
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_won BOOLEAN DEFAULT FALSE,
  total_moves INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  moves JSONB DEFAULT '[]'::jsonb
);
```

### Structure du champ `moves` (JSONB)

```json
[
  {
    "from": { "row": 2, "col": 0 },
    "to": { "row": 0, "col": 1 },
    "piece": "white",
    "timestamp": 1523
  },
  {
    "from": { "row": 0, "col": 0 },
    "to": { "row": 2, "col": 1 },
    "piece": "black",
    "timestamp": 3841
  }
]
```

- `from` / `to` : coordonnées de la case (row: 0-2, col: 0-2)
- `piece` : `"white"` ou `"black"`
- `timestamp` : millisecondes depuis le début de la partie

## Installation locale

### Prérequis

- Node.js 18+
- Compte Supabase (ou PostgreSQL local)

### Étapes

1. Cloner le repo :
```bash
git clone https://github.com/acherm/chessfoo-claude.git
cd chessfoo-claude
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
```bash
cp .env.example .env.local
```

Remplir `.env.local` :
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
# ou
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
```

4. Créer la table dans Supabase (SQL Editor) :
```sql
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_won BOOLEAN DEFAULT FALSE,
  total_moves INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  moves JSONB DEFAULT '[]'::jsonb
);
```

5. Lancer le serveur de développement :
```bash
npm run dev
```

6. Ouvrir http://localhost:3000

## Déploiement sur Vercel

1. Pusher le code sur GitHub
2. Importer le projet sur Vercel
3. Ajouter un storage Supabase dans Vercel (Storage > Create > Supabase)
4. Créer la table `game_sessions` dans Supabase
5. Visiter `/api/init` pour vérifier la connexion

## API Routes

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/init` | GET | Vérifie la connexion à la base de données |
| `/api/sessions` | GET | Liste toutes les sessions |
| `/api/sessions?type=stats` | GET | Retourne les statistiques globales |
| `/api/sessions` | POST | Crée une nouvelle session |
| `/api/sessions/[id]` | GET | Récupère une session spécifique |
| `/api/sessions/[id]` | PATCH | Met à jour une session (ajouter coup ou compléter) |

## Structure du projet

```
src/
├── app/
│   ├── api/
│   │   ├── init/route.ts           # Initialisation DB
│   │   └── sessions/
│   │       ├── route.ts            # CRUD sessions
│   │       └── [id]/route.ts       # Session individuelle
│   ├── history/page.tsx            # Page historique
│   ├── replay/[id]/page.tsx        # Page replay
│   ├── page.tsx                    # Page principale (jeu)
│   └── layout.tsx                  # Layout global
├── components/
│   └── ChessGame.tsx               # Composant du jeu
└── lib/
    └── db.ts                       # Fonctions Supabase
```

## Licence

MIT

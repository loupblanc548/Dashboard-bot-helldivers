# Dashboard Bot Helldivers

Dashboard web standalone pour le bot Discord Helldivers.
Connecté à la même base de données que le bot via Prisma.

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL (même DB que le bot) |
| `DISCORD_CLIENT_ID` | Client ID Discord (Developer Portal) |
| `DISCORD_CLIENT_SECRET` | Client Secret Discord (Developer Portal) |
| `JWT_SECRET` | Secret pour les sessions JWT (ex: `openssl rand -hex 32`) |
| `DASHBOARD_REDIRECT_URI` | URL de callback OAuth2 (ex: `https://xxx.up.railway.app/api/auth/callback`) |
| `PORT` | Port du serveur (auto sur Railway) |

## Développement local

```bash
npm install
npx prisma generate
npm run dev
```

→ http://localhost:3721

## Déploiement Railway

1. Créer un nouveau service depuis ce repo GitHub
2. Ajouter les variables d'environnement ci-dessus
3. Railway build automatiquement avec le Dockerfile
4. Générer un domaine dans Settings → Networking
5. Mettre à jour `DASHBOARD_REDIRECT_URI` avec le domaine Railway

## OAuth2 Discord

Dans le [Discord Developer Portal](https://discord.com/developers/applications) :
1. Onglet OAuth2 → Redirects
2. Ajouter : `https://TON-DOMAINE.up.railway.app/api/auth/callback`

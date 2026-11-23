# Association Al Jiwar — site web

Site en arabe (par défaut), français et anglais, avec un espace admin pour modifier les textes et les photos.
Aucune dépendance : il suffit de Node.js 18 ou plus.

## Ouvrir le site sur ce PC

```
node server.js
```

- Site : http://localhost:3000 (redirige vers /ar/ ; /fr/ et /en/ pour les autres langues)
- Admin : http://localhost:3000/admin — au premier lancement, un mot de passe est créé dans le fichier `.admin-password` (jamais envoyé sur GitHub).

## Pages

Accueil · Qui sommes-nous · Activités · Projets · Partenaires · Faire un don · Contact

Tout le contenu est dans `data/content.json` et se modifie depuis l'admin (onglets Général, Accueil, Qui sommes-nous, Activités, Projets, Partenaires, Dons & contact).
Un champ vide (téléphone, RIB, chiffre clé…) n'apparaît pas sur le site. Les textes entre crochets `[À compléter …]` sont à remplacer.

## En ligne sur Vercel (admin qui enregistre dans GitHub)

1. Dépôt GitHub `association-aljiwar` contenant ce dossier.
2. Vercel › Add New › Project › importer ce dépôt (aucun réglage de build).
3. Vercel › Settings › Environment Variables :
   - `ADMIN_PASSWORD` : le mot de passe de l'admin en ligne ;
   - `GH_REPO` : `banga-collab/association-aljiwar` ;
   - `GH_TOKEN` : un jeton GitHub « fine-grained » avec accès à ce seul dépôt, permission **Contents : Read and write**.
4. Redéployer. Chaque « Enregistrer » dans l'admin crée un commit dans GitHub ; les textes sont à jour tout de suite, une nouvelle photo déclenche un redéploiement (1 minute environ).

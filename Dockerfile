# Utilisation de la dernière version LTS de Node.js
FROM node:24-alpine

# Définition du répertoire de travail
WORKDIR /lemobici-api

# Copie des fichiers de configuration des dépendances
COPY .npmrc ./
COPY package*.json ./

# Installation de toutes les dépendances du projet
RUN npm install

# Copie du reste du code source
COPY . .

# Exposition du port de l'application
EXPOSE 3000

# Commande pour le développement avec hot-reload
CMD ["npm", "run", "start:dev"]
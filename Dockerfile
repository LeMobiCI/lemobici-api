FROM node:24-alpine
RUN apk add --no-cache curl

WORKDIR /lemobici-api
COPY package*.json ./

# Arguments de build
ARG NPM_TOKEN

# Configuration npm - Registry + Token
RUN npm config set @lemobici:registry https://npm.pkg.github.com
RUN npm config set //npm.pkg.github.com/:_authToken=$NPM_TOKEN

# Installation de toutes les dépendances du projet
RUN npm install

# Copie du reste du code source
COPY . .

# Netoyage du token apres l'installation
RUN npm config delete //npm.pkg.github.com/:_authToken

# Exposition du port de l'application
EXPOSE 3000

# Commande pour le développement avec hot-reload
CMD ["npm", "run", "start:dev"]
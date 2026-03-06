FROM node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm install

# Copier le reste
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Créer les répertoires nécessaires
RUN mkdir -p uploads/vehicules uploads/contrats logs

EXPOSE 5000

CMD ["npm", "run", "dev"]

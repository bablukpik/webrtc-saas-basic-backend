FROM node:20.18.0
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma/
RUN npx prisma generate
COPY ./ ./
EXPOSE 5000
CMD ["npm", "run", "dev"]

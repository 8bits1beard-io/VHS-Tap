FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
COPY public/ ./public/
COPY fetch_movie_metadata.js ./

RUN chown -R 2000:2000 /app

EXPOSE 3000

CMD ["node", "src/server.js"]

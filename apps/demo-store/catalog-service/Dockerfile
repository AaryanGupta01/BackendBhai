FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY dist ./dist
COPY lib ./lib
EXPOSE 3004
CMD ["node", "--import", "./lib/telemetry/preload.mjs", "dist/index.js"]

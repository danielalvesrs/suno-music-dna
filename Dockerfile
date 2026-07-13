FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 7860

CMD ["npm", "run", "start"]

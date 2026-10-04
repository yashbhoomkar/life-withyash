FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .

USER node

EXPOSE 5000
CMD ["npm", "start"]

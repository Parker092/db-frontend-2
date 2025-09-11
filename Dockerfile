# Stage 1: "Builder" - Install dependencies using authentication
FROM node:20-slim AS builder

WORKDIR /usr/src/app

RUN --mount=type=secret,id=npmrc,target=/usr/src/app/.npmrc \
    npm install -g google-artifactregistry-auth && \
    google-artifactregistry-auth --repo-config=.npmrc

COPY package*.json ./
RUN npm ci

COPY . .

# ---

FROM node:20-slim

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules

COPY --from=builder /usr/src/app .

EXPOSE 8080
CMD [ "node", "index.js" ]
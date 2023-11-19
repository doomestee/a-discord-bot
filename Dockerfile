# syntax=docker/dockerfile:1
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

# Installs latest Chromium (100) package.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

COPY ["package.json", "."]

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache git
RUN npm install

COPY . .

ENTRYPOINT [ "npm", "start" ]
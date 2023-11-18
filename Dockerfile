# syntax=docker/dockerfile:1
FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "."]

RUN apk add --no-cache git
# aaa libgl1 libnss3 libssl3 libxcursor1 libgtk2.0-0 xvfb
RUN npm install

COPY . .

ENTRYPOINT [ "npm", "start" ]
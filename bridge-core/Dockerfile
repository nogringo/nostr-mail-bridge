FROM node:24-alpine

WORKDIR /app

COPY bridge-core/package*.json ./bridge-core/
RUN cd bridge-core && npm install

COPY bridge-core ./bridge-core
RUN cd bridge-core && npm run build

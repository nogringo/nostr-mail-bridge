FROM node:22-alpine

WORKDIR /app

# Copy and build core first
COPY bridge-inbound/core /inbound-core
WORKDIR /inbound-core
RUN npm install && npm run build

# Now build smtp
WORKDIR /app
COPY bridge-inbound/smtp/package*.json ./
RUN npm install

COPY bridge-inbound/smtp .
RUN npm run build

EXPOSE 25

CMD ["npm", "start"]

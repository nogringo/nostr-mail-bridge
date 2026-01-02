FROM node:22-alpine

WORKDIR /app

# Copy and build inbound-core first
COPY bridge-inbound/core /inbound-core
WORKDIR /inbound-core
RUN npm install && npm run build

# Now build inbound-mailgun
WORKDIR /app
COPY bridge-inbound/mailgun/package*.json ./
RUN npm install

COPY bridge-inbound/mailgun .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]

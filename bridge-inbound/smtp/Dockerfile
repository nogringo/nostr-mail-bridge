FROM node:22-alpine

WORKDIR /app

# Create structure matching package.json paths
COPY bridge-inbound/packages/core ./bridge-inbound/packages/core
RUN cd bridge-inbound/packages/core && npm install && npm run build

# Copy and build server
COPY bridge-inbound/smtp ./bridge-inbound/smtp
RUN cd bridge-inbound/smtp && npm install && npm run build

WORKDIR /app/bridge-inbound/smtp
EXPOSE 25

CMD ["npm", "start"]

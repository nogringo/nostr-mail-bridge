FROM node:22-alpine

WORKDIR /app

# Create structure matching package.json paths
COPY bridge-inbound/packages ./bridge-inbound/packages

# Build packages
RUN cd bridge-inbound/packages/core && npm install && npm run build
RUN cd bridge-inbound/packages/mailgun && npm install && npm run build

# Copy and build server
COPY bridge-inbound/mailgun ./bridge-inbound/mailgun
RUN cd bridge-inbound/mailgun && npm install && npm run build

WORKDIR /app/bridge-inbound/mailgun
EXPOSE 3001

CMD ["npm", "start"]

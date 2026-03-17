FROM node:24-alpine

WORKDIR /app

# Copy bridge-core first (required by mailgun server)
COPY bridge-core ./bridge-core
RUN cd bridge-core && npm install && npm run build

# Copy and build mailgun package
COPY bridge-inbound/packages/mailgun ./bridge-inbound/packages/mailgun
RUN cd bridge-inbound/packages/mailgun && npm install && npm run build

# Copy and build mailgun server
COPY bridge-inbound/mailgun ./bridge-inbound/mailgun
RUN cd bridge-inbound/mailgun && npm install && npm run build

WORKDIR /app/bridge-inbound/mailgun
EXPOSE 3001

CMD ["npm", "start"]

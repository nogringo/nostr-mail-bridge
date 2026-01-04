FROM node:24

WORKDIR /app

# Create structure matching package.json paths
COPY bridge-inbound/packages/core ./bridge-inbound/packages/core
RUN cd bridge-inbound/packages/core && npm install && npm run build

# Copy and build bridge-outbound
COPY bridge-outbound ./bridge-outbound
RUN cd bridge-outbound && npm install && npm run build

WORKDIR /app/bridge-outbound
CMD ["npm", "start"]

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    postfix \
    opendkim \
    opendkim-tools \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create OpenDKIM directories
RUN mkdir -p /etc/opendkim/keys && \
    mkdir -p /var/run/opendkim && \
    chown -R opendkim:opendkim /etc/opendkim && \
    chown -R opendkim:opendkim /var/run/opendkim

# Copy OpenDKIM configuration
COPY opendkim.conf /etc/opendkim.conf
COPY opendkim-tables /etc/opendkim/

# Copy Postfix configuration
COPY main.cf /etc/postfix/main.cf

# Copy startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose SMTP ports
EXPOSE 25 587

# Use entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["postfix", "start-fg"]

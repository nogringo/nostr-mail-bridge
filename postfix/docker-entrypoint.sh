#!/bin/bash
set -e

DOMAIN=${DKIM_DOMAIN:-example.com}
KEYS_DIR="/etc/opendkim/keys"
SIGNING_TABLE="/etc/opendkim/signing.table"
KEY_TABLE="/etc/opendkim/key.table"
HOSTS_FILE="/etc/opendkim/hosts"

echo "=== Postfix + OpenDKIM Startup ==="
echo "Domain: $DOMAIN"

# Create hosts file if it doesn't exist
if [ ! -f "$HOSTS_FILE" ]; then
    echo "Creating hosts file..."
    echo "127.0.0.1" > "$HOSTS_FILE"
    echo "localhost" >> "$HOSTS_FILE"
    echo "172.16.0.0/12" >> "$HOSTS_FILE"
    chown opendkim:opendkim "$HOSTS_FILE"
fi

# Check if DKIM keys already exist
if [ ! -f "$KEYS_DIR/default.private" ]; then
    echo "Generating DKIM keys for domain: $DOMAIN..."

    cd "$KEYS_DIR"
    opendkim-genkey -t -s default -d "$DOMAIN"

    # Set proper permissions
    chown opendkim:opendkim default.private
    chmod 600 default.private

    # Create signing table
    echo "default@$DOMAIN default" > "$SIGNING_TABLE"

    # Create key table
    echo "default default:$DOMAIN:$KEYS_DIR/default.private" > "$KEY_TABLE"

    # Set permissions on tables
    chown opendkim:opendkim "$SIGNING_TABLE" "$KEY_TABLE"

    echo ""
    echo "=========================================="
    echo "DKIM keys generated successfully!"
    echo "=========================================="
    echo ""
    echo "Add this DNS TXT record:"
    echo "  Name: default._domainkey.$DOMAIN"
    echo "  Value:"
    cat default.txt | tr -d '"' | grep "v=DKIM1" || true
    echo ""
    echo "Also add SPF record:"
    echo "  Name: @$DOMAIN"
    echo "  Value: v=spf1 ip4:YOUR_VPS_IP -all"
    echo "=========================================="
    echo ""
else
    echo "DKIM keys found, skipping generation."
    
    # Ensure tables exist
    if [ ! -f "$SIGNING_TABLE" ]; then
        echo "default@$DOMAIN default" > "$SIGNING_TABLE"
        chown opendkim:opendkim "$SIGNING_TABLE"
    fi
    
    if [ ! -f "$KEY_TABLE" ]; then
        echo "default default:$DOMAIN:$KEYS_DIR/default.private" > "$KEY_TABLE"
        chown opendkim:opendkim "$KEY_TABLE"
    fi
fi

# Update Postfix main.cf with actual domain if not example.com
if [ "$DOMAIN" != "example.com" ]; then
    sed -i "s/mydomain = example.com/mydomain = $DOMAIN/g" /etc/postfix/main.cf
    sed -i "s/myhostname = mail.example.com/myhostname = mail.$DOMAIN/g" /etc/postfix/main.cf
    sed -i "s|myorigin = \$mydomain|myorigin = $DOMAIN|g" /etc/postfix/main.cf
fi

echo "Starting OpenDKIM..."
opendkim

echo "Starting Postfix..."
exec "$@"

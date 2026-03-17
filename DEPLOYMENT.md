# Nostr Mail Bridge Deployment Guide

Complete guide for deploying the Nostr ↔ Email bridge on a VPS with Docker Compose.

---

## 🚀 Quick Deployment

### Clone the Repository

```bash
git clone https://github.com/nogringo/nostr-mail-bridge.git
cd nostr-mail-bridge
```

### Create .env File

```bash
cp .env.example .env
vi .env
```

**Required Variables:**
```ini
# Nostr Keys (generated above)
BRIDGE_PRIVATE_KEY=<hex_private_key>
BRIDGE_PUBKEY=<pubkey_hex>

# Nostr Relays
RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band

# Bridge Domain
FROM_DOMAIN=yourdomain.com

# SMTP Configuration
SMTP_HOST=postfix
SMTP_PORT=25
SMTP_SECURE=false

# Plugins (optional)
PLUGIN_PATH=
```

### Start Services

```bash
docker compose up -d --build
```

### Verify

```bash
# View logs
docker compose logs -f

# Check running services
docker compose ps

# Test NIP-05
curl https://bridge.yourdomain.com/.well-known/nostr.json?name=_smtp_
```

---

## 🔐 NIP-05

The NIP-05 service enables Nostr email address verification.

### Automatic Configuration (Docker)

The `nip05-service` is included in docker-compose.yml.

```bash
# Start NIP-05 service
docker compose up -d nip05-service

# Verify
curl https://bridge.yourdomain.com/.well-known/nostr.json?name=<npub>
```

---

## 🌐 DNS & SPF/DKIM

### Required DNS Records

| Type | Name | Value | Description |
|------|------|-------|-------------|
| A | bridge | `VPS_IP` | Points to VPS |
| MX | @ | `bridge.yourdomain.com` (priority 10) | Receives emails |
| TXT | @ | `v=spf1 ip4:VPS_IP -all` | SPF - authorizes VPS |
| TXT | default._domainkey | `v=DKIM1; k=rsa; p=...` | DKIM - signing |

### Generate DKIM (with Postfix)

```bash
# Install OpenDKIM
sudo apt install -y opendkim opendkim-tools

# Generate key
opendkim-genkey -t -s default -d yourdomain.com

# Display public key
cat default.txt

# Add to DNS (copy value after 'p=')
```

### Verify Configuration

```bash
# Check SPF
dig TXT yourdomain.com

# Check DKIM
dig TXT default._domainkey.yourdomain.com

# Test with email
echo "Test" | mail -s "SPF/DKIM Test" test@check-auth@verifier.port25.com
```

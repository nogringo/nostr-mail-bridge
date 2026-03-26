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

# Bridge Domain
FROM_DOMAIN=yourdomain.com

# SMTP Configuration (internal)
SMTP_HOST=postfix
SMTP_PORT=25
SMTP_SECURE=false
SMTP_REJECT_UNAUTHORIZED=false

# Plugins (optional)
PLUGIN_PATH=
```

### Start Services

```bash
docker compose up -d
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

### DKIM

DKIM keys are automatically generated on first start and persisted in `./dkim-keys/`.

**Get your DKIM public key:**
```bash
cat dkim-keys/default.txt
```

Add the displayed TXT record to your domain zone.

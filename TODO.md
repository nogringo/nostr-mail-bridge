# TODO

## Architecture

- [ ] `bridge-outbound` depends on `@nostr-mail/bridge-inbound-core` only for `runPlugin`. Consider extracting the plugin system into a separate package `@nostr-mail/plugin` to avoid this coupling.

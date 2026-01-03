# TODO

## Features

- [ ] Optional NIP-17 DM delivery: allow users to receive emails via DM in addition to kind 1301. User preference could be stored in their Nostr profile or a NIP-51 list.

## Architecture

- [ ] `bridge-outbound` depends on `@nostr-mail/bridge-inbound-core` only for `runPlugin`. Consider extracting the plugin system into a separate package `@nostr-mail/plugin` to avoid this coupling.

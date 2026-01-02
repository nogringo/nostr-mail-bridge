class Config {
  static const List<String> relays = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://relay.primal.net',
    'wss://nostr-01.uid.ovh',
    'wss://nostr-02.uid.ovh',
    'wss://nostr-01.yakihonne.com',
  ];

  // Whitelist settings
  static const String whitelistOwnerPubkey =
      '0d365385f474d4b025377b4ade6ad241f847d514a9e9b475069f69a20f886c68';
  static const String whitelistName = 'email-whitelist';

  // NIP-85 settings
  static const String nip85ProviderPubkey =
      'ca8f64eae4f3559e3682083f013c947e492e44fb173645f0110a2f760ceff585';
  static const String nip85Relay = 'wss://nip85.brainstorm.world';
  static const int minScore = 20;
}

import 'dart:async';

import 'package:ndk/ndk.dart';

/// Service to fetch and check whitelist from Nostr using NIP-51 kind 30000 sets
class WhitelistService {
  final Ndk _ndk;
  final String _ownerPubkey;
  final String _listName;
  final Duration _timeout;

  Set<String> _whitelistedPubkeys = {};
  bool _isLoaded = false;

  WhitelistService({
    required Ndk ndk,
    required String ownerPubkey,
    String listName = 'email-whitelist',
    Duration timeout = const Duration(seconds: 10),
  }) : _ndk = ndk,
       _ownerPubkey = ownerPubkey,
       _listName = listName,
       _timeout = timeout;

  /// Fetch the whitelist from Nostr relays
  Future<void> fetch() async {
    final completer = Completer<void>();

    _ndk.lists
        .getPublicSets(kind: Nip51List.kFollowSet, publicKey: _ownerPubkey)
        .timeout(_timeout)
        .listen(
          (sets) {
            if (sets != null) {
              for (final set in sets) {
                if (set.name == _listName) {
                  _whitelistedPubkeys = set.pubKeys.map((e) => e.value).toSet();
                  break;
                }
              }
            }
          },
          onDone: () {
            _isLoaded = true;
            if (!completer.isCompleted) completer.complete();
          },
          onError: (e) {
            _isLoaded = true;
            if (!completer.isCompleted) completer.complete();
          },
        );

    await completer.future;
  }

  /// Check if a pubkey is in the whitelist
  bool isWhitelisted(String pubkey) {
    if (!_isLoaded) {
      throw StateError('Whitelist not loaded. Call fetch() first.');
    }
    return _whitelistedPubkeys.contains(pubkey);
  }

  /// Get all whitelisted pubkeys
  Set<String> get whitelistedPubkeys => Set.unmodifiable(_whitelistedPubkeys);

  /// Check if the whitelist has been loaded
  bool get isLoaded => _isLoaded;

  /// Number of entries in the whitelist
  int get count => _whitelistedPubkeys.length;
}

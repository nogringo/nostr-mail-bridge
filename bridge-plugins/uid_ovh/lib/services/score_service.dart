import 'dart:async';

import 'package:ndk/ndk.dart';

/// Service to fetch NIP-85 trust scores from Nostr
class ScoreService {
  final Ndk _ndk;
  final String _providerPubkey;
  final Duration _timeout;

  /// NIP-85 kind for user assertions
  static const int kUserAssertion = 30382;

  ScoreService({
    required Ndk ndk,
    required String providerPubkey,
    Duration timeout = const Duration(seconds: 10),
  }) : _ndk = ndk,
       _providerPubkey = providerPubkey,
       _timeout = timeout;

  /// Fetch the trust score for a pubkey
  /// Returns null if no score found or timeout
  Future<int?> getScore(String targetPubkey) async {
    final filter = Filter(
      authors: [_providerPubkey],
      kinds: [kUserAssertion],
      dTags: [targetPubkey],
    );

    final response = _ndk.requests.query(filters: [filter]);

    try {
      await for (final event in response.stream.timeout(_timeout)) {
        return _parseRank(event);
      }
    } on TimeoutException {
      return null;
    }

    return null;
  }

  /// Parse the rank tag from a NIP-85 event
  int? _parseRank(Nip01Event event) {
    for (final tag in event.tags) {
      if (tag.isNotEmpty && tag[0] == 'rank' && tag.length > 1) {
        return int.tryParse(tag[1]);
      }
    }
    return null;
  }
}

import 'dart:convert';
import 'dart:io';

import 'package:ndk/ndk.dart';
import 'package:uid_ovh/config.dart';
import 'package:uid_ovh/uid_ovh.dart';

/// Bridge plugin that checks incoming emails against a NIP-51 whitelist
void main(List<String> arguments) async {
  final input = await stdin.transform(utf8.decoder).join();

  try {
    final json = jsonDecode(input) as Map<String, dynamic>;
    final pluginInput = PluginInput.fromJson(json);

    // Log to stderr (shows in console)
    stderr.writeln('=== Plugin received ===');
    stderr.writeln('Type: ${pluginInput.type}');
    stderr.writeln('From: ${pluginInput.event.from}');
    stderr.writeln('To: ${pluginInput.event.to}');
    stderr.writeln('Subject: ${pluginInput.event.subject}');
    stderr.writeln(
      'Source: ${pluginInput.sourceType} (${pluginInput.sourceInfo})',
    );
    stderr.writeln('=======================');

    final output = await processPlugin(pluginInput);

    stdout.writeln(jsonEncode(output.toJson()));
  } catch (e, stack) {
    stderr.writeln('Plugin error: $e');
    stderr.writeln(stack);

    final output = PluginOutput(
      id: 'error',
      action: PluginAction.reject,
      msg: 'Plugin error: $e',
    );
    stdout.writeln(jsonEncode(output.toJson()));
    exit(1);
  }
}

Future<PluginOutput> processPlugin(PluginInput input) async {
  final senderPubkey = input.event.senderPubkey;

  // If no sender pubkey, we can't verify the sender
  if (senderPubkey == null || senderPubkey.isEmpty) {
    stderr.writeln('No sender pubkey, rejecting');
    return PluginOutput(
      id: input.event.from,
      action: PluginAction.reject,
      msg: 'No sender pubkey provided',
    );
  }

  // Initialize NDK with NIP-85 relay
  final relays = [...Config.relays, Config.nip85Relay];
  final ndk = Ndk(
    NdkConfig(
      eventVerifier: Bip340EventVerifier(),
      cache: MemCacheManager(),
      bootstrapRelays: relays,
      logLevel: LogLevel.off,
    ),
  );

  try {
    // Check 1: Is sender in whitelist?
    final whitelistService = WhitelistService(
      ndk: ndk,
      ownerPubkey: Config.whitelistOwnerPubkey,
      listName: Config.whitelistName,
    );

    await whitelistService.fetch();
    stderr.writeln('Whitelist loaded: ${whitelistService.count} entries');

    if (whitelistService.isWhitelisted(senderPubkey)) {
      stderr.writeln('Sender $senderPubkey is whitelisted, accepting');
      return PluginOutput(id: senderPubkey, action: PluginAction.accept);
    }

    stderr.writeln('Sender not in whitelist, checking NIP-85 score...');

    // Check 2: Does sender have score > minScore?
    final scoreService = ScoreService(
      ndk: ndk,
      providerPubkey: Config.nip85ProviderPubkey,
    );

    final score = await scoreService.getScore(senderPubkey);
    stderr.writeln('NIP-85 score for $senderPubkey: $score');

    if (score != null && score > Config.minScore) {
      stderr.writeln('Score $score > ${Config.minScore}, accepting');
      return PluginOutput(id: senderPubkey, action: PluginAction.accept);
    }

    // Neither whitelisted nor has sufficient score
    stderr.writeln(
      'Sender not whitelisted and score <= ${Config.minScore}, rejecting',
    );
    return PluginOutput(
      id: senderPubkey,
      action: PluginAction.reject,
      msg: 'Sender not whitelisted and trust score too low',
    );
  } finally {
    // Cleanup NDK resources
    await ndk.destroy();
  }
}

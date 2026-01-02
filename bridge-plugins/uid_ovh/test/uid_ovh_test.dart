import 'dart:convert';
import 'dart:io';

import 'package:test/test.dart';

void main() {
  test('check pubkey returns accept or reject', () async {
    const testPubkey =
        '460c25e682fda7832b52d1f22d3d22b3176d972f60dcdc3212ed8c92ef85065c';

    final inputJson = jsonEncode({
      'type': 'inbound',
      'event': {
        'from': 'test@example.com',
        'to': 'recipient@example.com',
        'subject': 'Test',
        'body': 'Test body',
        'senderPubkey': testPubkey,
      },
      'receivedAt': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      'sourceType': 'smtp',
      'sourceInfo': '127.0.0.1',
    });

    final process = await Process.start('dart', ['run', 'bin/uid_ovh.dart']);

    process.stdin.write(inputJson);
    await process.stdin.close();

    final stderr = await process.stderr.transform(utf8.decoder).join();
    final stdout = await process.stdout.transform(utf8.decoder).join();

    print(stderr);
    print('Result: $stdout');

    final output = jsonDecode(stdout.trim()) as Map<String, dynamic>;
    print('Action: ${output['action']}');
  });
}

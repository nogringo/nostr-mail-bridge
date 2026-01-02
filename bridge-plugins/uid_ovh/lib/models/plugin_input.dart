class PluginEvent {
  final String from;
  final String to;
  final String subject;
  final String body;
  final String? senderPubkey;
  final String? recipientPubkey;

  PluginEvent({
    required this.from,
    required this.to,
    required this.subject,
    required this.body,
    this.senderPubkey,
    this.recipientPubkey,
  });

  factory PluginEvent.fromJson(Map<String, dynamic> json) {
    return PluginEvent(
      from: json['from'] as String,
      to: json['to'] as String,
      subject: json['subject'] as String,
      body: json['body'] as String,
      senderPubkey: json['senderPubkey'] as String?,
      recipientPubkey: json['recipientPubkey'] as String?,
    );
  }
}

class PluginInput {
  final String type; // 'inbound' | 'outbound'
  final PluginEvent event;
  final int receivedAt;
  final String sourceType; // 'smtp' | 'mailgun' | 'nostr'
  final String sourceInfo;

  PluginInput({
    required this.type,
    required this.event,
    required this.receivedAt,
    required this.sourceType,
    required this.sourceInfo,
  });

  factory PluginInput.fromJson(Map<String, dynamic> json) {
    return PluginInput(
      type: json['type'] as String,
      event: PluginEvent.fromJson(json['event'] as Map<String, dynamic>),
      receivedAt: json['receivedAt'] as int,
      sourceType: json['sourceType'] as String,
      sourceInfo: json['sourceInfo'] as String,
    );
  }
}

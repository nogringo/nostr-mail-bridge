enum PluginAction { accept, reject, shadowReject }

class PluginOutput {
  final String id;
  final PluginAction action;
  final String? msg;

  PluginOutput({required this.id, required this.action, this.msg});

  Map<String, dynamic> toJson() {
    return {'id': id, 'action': action.name, if (msg != null) 'msg': msg};
  }
}

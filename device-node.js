module.exports = class DeviceNode {
  constructor(RED, options) {
    RED.nodes.createNode(this, options)

    this.friendlyName = options.friendlyName
    this.baseTopic = options.baseTopic

    this.qos = options.qos
    this.nl = options.nl
    this.rap = options.rap
    this.rh = options.rh

    this.broker = options.broker
    this.brokerConnection = RED.nodes.getNode(this.broker)

    this.v5 =
      this.brokerConnection.options &&
      this.brokerConnection.options.protocolVersion === 5
  }
}

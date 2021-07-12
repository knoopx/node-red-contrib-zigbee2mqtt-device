const isUtf8 = require("is-utf8")

const DeviceNode = require("./device-node")

function truthy(value) {
  if (value === "true" || value === true) {
    return true
  }
  return false
}

function getPrettyDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour12: false,
    hour: "numeric",
    minute: "numeric",
  })
}

module.exports = (RED) => {
  class DeviceInNode extends DeviceNode {
    constructor(options) {
      super(RED, options)

      this.topic = [this.baseTopic, this.friendlyName].join("/")

      if (
        !/^(#$|(\+|[^+#]*)(\/(\+|[^+#]*))*(\/(\+|#|[^+#]*))?$)/.test(this.topic)
      ) {
        return this.warn("invalid topic", { topic: this.topic })
      }

      this.on("input", this.onInput)
      this.on("close", this.onClose)

      this.setStatusDisconnected()

      if (this.brokerConnection) {
        this.brokerConnection.register(this)
      } else {
        this.error("broker not configured")
      }

      if (options.subscribeOnConnect) {
        this.subscribe()
      }
    }

    onInput = (msg) => {
      if (msg.payload === "enable") {
        this.subscribe()
      }

      if (msg.payload === "disable") {
        this.unsubscribe()
      }
    }

    subscribe = () => {
      const options = {
        qos: Number(this.qos),
      }

      if (this.v5) {
        options.rh = Number(this.rh)
        options.nl = truthy(this.nl)
        options.rap = truthy(this.rap)
      }

      this.brokerConnection.subscribe(
        this.topic,
        options,
        this.onMessage,
        this.id,
      )
      this.setStatusConnected()
    }

    unsubscribe = () => {
      if (this.brokerConnection) {
        this.brokerConnection.unsubscribe(this.topic, this.id)
        this.setStatusDisconnected()
      }
    }

    setStatusConnected = () => {
      this.status({
        fill: "green",
        shape: "dot",
        text: "node-red:common.status.connected",
      })
    }

    setStatusDisconnected = () => {
      this.status({
        fill: "red",
        shape: "ring",
        text: "node-red:common.status.disconnected",
      })
    }

    updateStatus = (message) => {
      this.status({
        fill: "green",
        shape: "ring",
        text: `${message} at: ${getPrettyDate()}`,
      })
    }

    onMessage = (topic, message, { qos, retain }) => {
      if (isUtf8(message)) {
        message = message.toString()
        try {
          message = JSON.parse(message)
        } catch (e) {
          this.error("unable to parse MQTT message as JSON", {
            message,
            topic,
            qos,
            retain,
          })
          return
        }
      } else {
        this.error("unknown message encoding", {
          message,
          topic,
          qos,
          retain,
        })
        return
      }

      this.updateStatus("message")

      const msg = {
        topic,
        payload: message,
        data: { qos, retain },
      }

      this.send(msg)
    }

    onClose = (done) => {
      this.unsubscribe()
      this.brokerConnection.deregister(this, done)
    }
  }

  RED.nodes.registerType("device in", DeviceInNode)
}

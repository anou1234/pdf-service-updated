import logger from "../config/logger";
var kafka = require("kafka-node");
import envVariables from "../EnvironmentVariables";

let exportedProducer;

if (!envVariables.KAFKA_ENABLED) {
  // Provide a stub producer that matches the interface but doesn't send
  logger.warn("Kafka is disabled. Exporting a no-op producer.");
  exportedProducer = {
    send: (payloads, cb) => {
      logger.warn("Kafka disabled: skipping send");
      if (cb) cb(null, { disabled: true });
    }
  };
} else {
  const Producer = kafka.Producer;
  let client;
  client = new kafka.KafkaClient({ kafkaHost: envVariables.KAFKA_BROKER_HOST, connectRetryOptions: { retries: 1 } });

  const producer = new Producer(client);

  producer.on("ready", function () {
    logger.info("Producer is ready");
  });

  producer.on("error", function (err) {
    logger.error("Producer is in error state");
    logger.error(err.stack || err);
  });

  exportedProducer = producer;
}

export default exportedProducer;

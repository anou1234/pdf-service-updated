const envVariables = {
  MAX_NUMBER_PAGES: process.env.MAX_NUMBER_PAGES || 80,
  EGOV_HOST: process.env.EGOV_HOST || "https://mseva-dev.lgpunjab.gov.in/",
  EGOV_LOCALISATION_HOST:
    process.env.EGOV_LOCALISATION_HOST || "https://mseva-dev.lgpunjab.gov.in/",
  EGOV_LOCALISATION_SEARCH:
    process.env.EGOV_LOCALISATION_SEARCH || "/localization/messages/v2/_search",
  EGOV_FILESTORE_SERVICE_HOST:
    process.env.EGOV_FILESTORE_SERVICE_HOST || "http://egov-filestore:8082",
  SERVER_PORT: process.env.SERVER_PORT || 8082,

  KAFKA_BROKER_HOST: process.env.KAFKA_BROKER_HOST || "localhost:9092",
  KAFKA_CREATE_JOB_TOPIC:
    process.env.KAFKA_CREATE_JOB_TOPIC || "PDF_GEN_CREATE",
  KAFKA_RECEIVE_CREATE_JOB_TOPIC:
    process.env.KAFKA_RECEIVE_CREATE_JOB_TOPIC || "PDF_GEN_RECEIVE",
  KAFKA_PDF_ERROR_TOPIC: process.env.KAFKA_PDF_ERROR_TOPIC || "PDF_GEN_ERROR",
  KAFKA_TOPICS_NOTIFICATION:
    process.env.KAFKA_TOPICS_NOTIFICATION || "egov.core.notification.sms",
  // Toggle Kafka usage for local dev; set KAFKA_ENABLED=false to disable producer/consumer
  KAFKA_ENABLED:
    (process.env.KAFKA_ENABLED || "false").toLowerCase() === "true",
  // When true, treat Kafka publish failures as fatal for API responses.
  // Defaults to false to allow graceful degradation when Kafka is down or misconfigured.
  KAFKA_STRICT: (process.env.KAFKA_STRICT || "false").toLowerCase() === "true",
  DATE_TIMEZONE: process.env.DATE_TIMEZONE || "Asia/Kolkata",
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "postgres",
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_NAME: process.env.DB_NAME || "PdfGen",
  DB_PORT: process.env.DB_PORT || 5432,
  EGOV_EXTERNAL_HOST:
    process.env.EGOV_EXTERNAL_HOST || "https://dev.digit.org/",
  SAVE_PDF_DIR: process.env.SAVE_PDF_DIR || "/mnt/pdf/",
  DEFAULT_LOCALISATION_LOCALE:
    process.env.DEFAULT_LOCALISATION_LOCALE || "en_IN",
  DEFAULT_LOCALISATION_TENANT: process.env.DEFAULT_LOCALISATION_TENANT || "pg",
  // Optional: path to a custom CA certificate bundle for HTTPS calls.
  // Useful behind corporate proxies or with self-signed certs. Leave undefined to use Node's defaults.
  CA_CERT_PATH: process.env.CA_CERT_PATH,
  // In local/dev, rewrite internal docker service hosts (egov-localization, *.egov)
  // to use EGOV_HOST + path. Set to 'false' to disable.
  REWRITE_INTERNAL_HOSTS:
    (process.env.REWRITE_INTERNAL_HOSTS || "true").toLowerCase() === "true",
  // Optional config URL lists for PDF templates; provide as comma-separated values via env if needed.
  //uat paths:
  // "C:/Users/KPMG/OneDrive - BML MUNJAL UNIVERSITY/Documents/Github/punjab-rainmaker-customization/configs/pdf-service/data-config/ndc-receipt.json",
  // "C:/Users/KPMG/OneDrive - BML MUNJAL UNIVERSITY/Documents/Github/punjab-rainmaker-customization/configs/pdf-service/format-config/ndc-receipt.json",

  // prod paths :
  //     "C:/Users/KPMG/OneDrive - BML MUNJAL UNIVERSITY/Documents/Github/new_prod_rainmaker/punjab-rainmaker-customization/configs/pdf-service/data-config/pet-receipt-employee.json",
  // "C:/Users/KPMG/OneDrive - BML MUNJAL UNIVERSITY/Documents/Github/new_prod_rainmaker/punjab-rainmaker-customization/configs/pdf-service/format-config/pet-receipt-employee.json",

  //chips paths:
  //C:/Users/anoushkas1/OneDrive - KPMG/Documents/GitHub/chips_rainmaker/rainmaker-customization/configs/pdf-service/data-config/ownerconsent.json
  //C:/Users/anoushkas1/OneDrive - KPMG/Documents/GitHub/chips_rainmaker/rainmaker-customization/configs/pdf-service/format-config/ownerconsent.json

  DATA_CONFIG_URLS:
  "file://C:/Users/KPMG/OneDrive - BML MUNJAL UNIVERSITY/Documents/Github/punjab-rainmaker-customization/configs/pdf-service/data-config/communityhallowner.json",
FORMAT_CONFIG_URLS:
  "file://C:/Users/KPMG/OneDrive - BML MUNJAL UNIVERSITY/Documents/Github/punjab-rainmaker-customization/configs/pdf-service/format-config/communityhallowner.json",};
export default envVariables;



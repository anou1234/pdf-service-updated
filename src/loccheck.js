const businessServices = [
  "BPA_LOW",
  "BPA",
  "BPA_OC",
  "BPA_MC",
  "BPA_NP",
  "BPA_MC_HIGH",
  "BPA_NP_HIGH",
  "BPA_MC_OTH",
  "BPA_NP_OTH",
];

const statuses = ["STP", "ATP", "LEVEL3", "MTP", "LEVEL4"];

const messageByStatus = {
  STP: "STP Verification Pending",
  ATP: "ATP Verification Pending",
  LEVEL3: "ATP Verification Pending",
  MTP: "MTP Verification Pending",
  LEVEL4: "MTP Verification Pending",
};

const localizations = [];

businessServices.forEach((service) => {
  statuses.forEach((status) => {
    localizations.push({
      code: `BPA_HEADER_${service}_FORWARD_${status}_VERIFICATION_PENDING`,
      message: messageByStatus[status],
      module: "rainmaker-bpa",
      locale: "en_IN",
    });

    localizations.push({
      code: `WF_${service}_${status}_VERIFICATION_PENDING`,
      message: messageByStatus[status],
      module: "rainmaker-bpa",
      locale: "en_IN",
    });
  });
});

console.log(JSON.stringify(localizations, null, 2));
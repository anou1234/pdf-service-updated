const fs = require("fs");

// Load your tenants.json
const data = require("./tenantsprod.json");

// ✅ CONSTANT footer logo URL (same as your working ULB)
const FOOTER_LOGO =
  "https://mseva-dev.lgpunjab.gov.in/filestore/v1/files/viewfile/?name=pb%2FTL%2FMay%2F11%2F1778479236039cuqepmfaxv.png";

// ✅ Iterate and add footerLogo to all tenants
data.tenants = data.tenants.map((tenant) => {
  return {
    ...tenant,
    footerLogo: FOOTER_LOGO,
  };
});

// ✅ Save updated file
fs.writeFileSync(
  "./tenants_updated.json",
  JSON.stringify(data, null, 2),
  "utf-8"
);

console.log("✅ footerLogo added to all tenants!");
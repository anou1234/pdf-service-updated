// const fs = require("fs");

// const data = JSON.parse(fs.readFileSync("temp.json", "utf-8"));


// const filtered = data.tenants.filter((tenant) =>
//   /^pb\.it[a-z]/.test(tenant.code)
// );

// console.log(JSON.stringify(filtered, null, 2));

// console.log('filtered.length', filtered.length)

// // Optional: save to a file
// fs.writeFileSync("filtered_tenants.json", JSON.stringify(filtered, null, 2));



// const fs = require("fs");

// const data = JSON.parse(fs.readFileSync("filtered_tenants.json", "utf-8"));

// const localization = data.map((tenant) => ({
//   code: `TENANT_TENANTS_${tenant.code.replace(/\./g, "_").toUpperCase()}`,
//   message: tenant.city.municipalityName,
//   module: "rainmaker-common",
//   locale: "en_IN",
// }));

// console.log(JSON.stringify(localization, null, 2));
// console.log("Count:", localization.length);

// fs.writeFileSync("localizationtenantsIT.json", JSON.stringify(localization, null, 2));


const fs = require("fs");
const BUSINESS_SERVICES = [
  "BPA_LOW",
  "BPA",
  "BPA_OC",
  "BPA_MC",
  "BPA_NP",
  "BPA_MC_HIGH",
  "BPA_NP_HIGH",
  "BPA_NP_OTH",
  "BPA_MC_OTH",
];

const BPA_ROLES = [
  "BPA_VERIFIER",
  "CEMP",
  "BPA_APPROVER",
  "BPA_FIELD_INSPECTOR",
  "BPA_NOC_VERIFIER",
  "AIRPORT_AUTHORITY_APPROVER",
  "FIRE_NOC_APPROVER",
  "NOC_DEPT_APPROVER",
  "BPA_NOC_VERIFIER",
  "TOWNPLANNER",
  "ENGINEER",
  "BUILDER",
  "STRUCTURALENGINEER",
  "SUPERVISOR",
  "BPA_DOC_VERIFIER",
  "DESIGNER",
  "ARCHITECT"
];

// Optional prettier labels for message text
const ROLE_LABELS = {
  BPA_BUILDER: "Builder",
  BPA_ENGINEER: "Engineer",
  BPA_STRUCTURALENGINEER: "Structural Engineer",
  BPA_TOWNPLANNER: "Town Planner",
  BPA_DESIGNER: "Designer",
  BPA_SUPERVISOR: "Supervisor",
  BPA_VERIFIER: "BPA Verifier",
  BPA_APPROVER: "BPA Approver",
  BPA_FIELD_INSPECTOR: "BPA Field Inspector",
  BPA_NOC_VERIFIER: "BPA NOC Verifier",
  AIRPORT_AUTHORITY_APPROVER: "Airport Authority Approver",
  FIRE_NOC_APPROVER: "Fire NOC Approver",
  NOC_DEPT_APPROVER: "NOC Dept Approver",
  BPA_DOC_VERIFIER: "BPA Doc Verifier",
  CEMP: "CEMP",
  EMPLOYEE: "Employee",
};

// fallback if a role is not present in ROLE_LABELS
function prettifyRole(role) {
  return role
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function generateLocalizationObjects({
  businessServices,
  roles,
  roleLabels = {},
  module = "rainmaker-common",
  locale = "en_IN",
}) {
  const uniqueRoles = [...new Set(roles)];

  return uniqueRoles.flatMap((role) => {

    return businessServices.map((service) => ({
      code: `WF_${service}_SAVE_AS_DRAFT_BY_${role}_DONE`,
      message: `Save As Draft Done`,
      module,
      locale,
    }));
  });
}

const localizationObjects = generateLocalizationObjects({
  businessServices: BUSINESS_SERVICES,
  roles: BPA_ROLES,
  roleLabels: ROLE_LABELS,
});

console.log(JSON.stringify(localizationObjects, null, 2));

fs.writeFileSync("localizationsBPAROLE.json", JSON.stringify(localizationObjects, null, 2));

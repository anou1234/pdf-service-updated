// IMPORTANT: Use exact filenames
const tenantsData = require("./tenants.json");
const fileUrls = require("./file-urls.json");

// Extract URLs in insertion order
const urlsInOrder = Object.values(fileUrls);

// Basic safety checks
if (!Array.isArray(tenantsData.tenants)) {
  throw new Error("❌ tenants.json does not contain a tenants array");
}

if (urlsInOrder.length < tenantsData.tenants.length) {
  throw new Error(
    `❌ Not enough URLs: ${urlsInOrder.length} URLs for ${tenantsData.tenants.length} tenants`
  );
}

// Replace logoId strictly by index (ORDER → ORDER)
tenantsData.tenants.forEach((tenant, index) => {
  tenant.logoId = urlsInOrder[index];
});

// Write output (require cannot write, fs is OK for output)
const fs = require("fs");
fs.writeFileSync(
  "./tenants.updated.json",
  JSON.stringify(tenantsData, null, 2),
  "utf8"
);

console.log("✅ logoId replaced successfully using require()");
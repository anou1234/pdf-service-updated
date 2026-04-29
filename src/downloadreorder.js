const fs = require("fs");
const path = require("path");

// Load images.json
const data = require("./images.json");

// Folder with downloaded images
const downloadsDir = path.join(__dirname, "downloads");

if (!fs.existsSync(downloadsDir)) {
  console.error("downloads folder not found");
  process.exit(1);
}

const tenants = data.tenants;

// Build a map of existing files
const existingFiles = new Set(
  fs.readdirSync(downloadsDir)
);

// Reorder files based on images.json order
tenants.forEach((tenant, index) => {
  if (!tenant.logoId) return;

  const safeName = tenant.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");

  const oldFileName = `${safeName}.png`;
  const oldPath = path.join(downloadsDir, oldFileName);

  if (!existingFiles.has(oldFileName)) {
    console.warn(`⚠️ Missing file: ${oldFileName}`);
    return;
  }

  const newFileName =
    `${String(index + 1).padStart(3, "0")}_${safeName}.png`;
  const newPath = path.join(downloadsDir, newFileName);

  fs.renameSync(oldPath, newPath);
  console.log(`✅ ${oldFileName} → ${newFileName}`);
});

console.log("✅ Reordering complete");
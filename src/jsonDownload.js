
const fs = require("fs");
const https = require("https");
const path = require("path");

// Load JSON
const data = require("./images.json");

// Output directory
const outputDir = path.join(__dirname, "downloads");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

function download(url, filename) {
  const file = fs.createWriteStream(filename);

  https.get(url, response => {
    response.pipe(file);
    file.on("finish", () => {
      file.close();
      console.log("Downloaded:", filename);
    });
  }).on("error", err => {
    fs.unlink(filename, () => {});
    console.error("Error:", err.message);
  });
}

data.tenants.forEach((tenant, index) => {
  if (!tenant.logoId) return;

  // Clean name for filename
  const safeName = tenant.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");

  const filePath = path.join(outputDir, `${safeName}.png`);

  download(tenant.logoId, filePath);
});

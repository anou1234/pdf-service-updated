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

/* CHANGE 1: return a Promise */
function download(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);

    https.get(url, response => {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log("Downloaded:", filename);
        resolve();
      });
    }).on("error", err => {
      fs.unlink(filename, () => {});
      reject(err);
    });
  });
}

/* CHANGE 2: async wrapper */
/* CHANGE 3: await */
(async () => {
  for (const tenant of data.tenants) {
    if (!tenant.logoId) continue;

    const safeName = tenant.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    const filePath = path.join(outputDir, `${safeName}.png`);

    await download(tenant.logoId, filePath);
  }
})();
const fs = require("fs");

// Read input JSON file
const data = JSON.parse(fs.readFileSync("occ.json", "utf-8"));

const output = data.NewSubOccupancyType.map((ob) => {
  const code = ob.code || "";
  const name = ob.name || "";

  // Convert to uppercase and replace "-" with "_"
  const formattedCode = code.toUpperCase().replace(/-/g, "_");

  return {
    code: `BPA_SUBOCCUPANCYTYPE_${formattedCode}`,
    message: name,
    module: "rainmaker-bpa",
    locale: "en_IN",
  };
});

// Write output file
fs.writeFileSync(
  "occloc.json",
  JSON.stringify(output, null, 2),
  "utf-8"
);

console.log("Localization file generated: localization.json");
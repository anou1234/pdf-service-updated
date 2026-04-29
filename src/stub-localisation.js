const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

/**
 * Returns a simple response shape similar to egov-localization search.
 * Adjust as needed if your pdf-service expects a different shape.
 */
app.post("/localization/messages/v2/_search", (req, res) => {
  const body = req.body || {};
  // If request asks for codes, return them as messages; otherwise return empty array.
  const codes =
    (body && body.codes) || (body && body.request && body.request.codes) || [];
  const messages =
    Array.isArray(codes) && codes.length
      ? codes.map((c) => ({ code: c, message: c }))
      : [
          // fallback example keys the service may request; you can add more if required.
          { code: "PDF_TITLE", message: "PDF_TITLE" },
        ];

  res.json({
    response: {
      messages,
    },
  });
});

// optional health
app.get("/health", (req, res) => res.send("ok"));

const PORT = process.env.STUB_LOCALISATION_PORT || 8088;
app.listen(PORT, () =>
  console.log(`Stub localisation listening on http://127.0.0.1:${PORT}`)
);

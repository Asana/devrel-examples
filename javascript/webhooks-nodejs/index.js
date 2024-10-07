const express = require("express");
const crypto = require("crypto");
require("dotenv").config();

// Initializes Express app.
const app = express();

// Parses JSON bodies.
app.use(express.json());

// Local endpoint for receiving events
app.post("/receiveWebhook", (req, res) => {
  if (req.headers["x-hook-secret"]) {
    console.log("This is a new webhook");
    // Environment variable to store the X-Hook-Secret
    // Read more about the webhook "handshake" here: https://developers.asana.com/docs/webhooks-guide#the-webhook-handshake
    process.env.X_HOOK_SECRET = req.headers["x-hook-secret"];

    res.setHeader("X-Hook-Secret", process.env.X_HOOK_SECRET);
    res.sendStatus(200);
  } else if (req.headers["x-hook-signature"]) {
    const computedSignature = crypto
      .createHmac("SHA256", process.env.X_HOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(req.headers["x-hook-signature"]),
        Buffer.from(computedSignature)
      )
    ) {
      // Fail
      res.sendStatus(401);
    } else {
      // Success
      res.sendStatus(200);
      console.log(`Events on ${Date()}:`);
      console.log(req.body.events);
    }
  } else {
    console.error("Something went wrong!");
  }
});

app.listen(8080, () => {
  console.log("Server started on port 8080");
});

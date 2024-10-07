const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Initializes Express app.
const app = express();

// Parses JSON bodies.
app.use(express.json());

// File path for the .env file (where the value for X-Hook-Secret is stored)
const envFilePath = path.join(__dirname, ".env");

// Local endpoint for receiving events
app.post("/receiveWebhook", (req, res) => {
  if (req.headers["x-hook-secret"]) {
    console.log("This is a new webhook");
    const newSecret = req.headers["x-hook-secret"];

    // Environment variable to store the X-Hook-Secret
    // Read more about the webhook "handshake" here: https://developers.asana.com/docs/webhooks-guide#the-webhook-handshake
    process.env.X_HOOK_SECRET = newSecret;
    console.log(
      `The X-Hook-Secret stored by this server is: ${process.env.X_HOOK_SECRET}`
    );

    // Write the X-Hook-Secret to the .env file
    let envContent = fs.readFileSync(envFilePath, "utf8");
    envContent = envContent.replace(
      /X_HOOK_SECRET=.*/,
      `X_HOOK_SECRET=${newSecret}`
    );
    fs.writeFileSync(envFilePath, envContent);

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

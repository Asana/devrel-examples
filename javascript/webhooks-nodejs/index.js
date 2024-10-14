const express = require("express");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();

// Initializes Express app
const app = express();

// Parses JSON bodies
app.use(express.json());

// File path for the .env file (where the value for X-Hook-Secret is stored)
const envFilePath = path.join(__dirname, ".env");

// Helper function to read the X-Hook-Secret from the .env file
function getXHookSecret() {
  const envContent = fs.readFileSync(envFilePath, "utf8");
  const match = envContent.match(/X_HOOK_SECRET=(.*)/);
  return match ? match[1] : "";
}

// Local endpoint for receiving events
app.post("/receiveWebhook", (req, res) => {
  if (req.headers["x-hook-secret"]) {
    console.log("This is a new webhook");
    const newSecret = req.headers["x-hook-secret"];

    // Update the X-Hook-Secret in the .env file (in a production setting, this value should be securely stored in a database)
    let envContent = fs.readFileSync(envFilePath, "utf8");
    envContent = envContent.replace(
      /X_HOOK_SECRET=.*/,
      `X_HOOK_SECRET=${newSecret}`
    );
    fs.writeFileSync(envFilePath, envContent);

    console.log(`The X-Hook-Secret stored in .env is: ${newSecret}`);

    res.setHeader("X-Hook-Secret", newSecret);
    res.sendStatus(200);
  } else if (req.headers["x-hook-signature"]) {
    const storedSecret = getXHookSecret();
    const computedSignature = crypto
      .createHmac("SHA256", storedSecret)
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

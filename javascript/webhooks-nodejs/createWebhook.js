const axios = require("axios");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();

// File path for the .env file
const envFilePath = path.join(__dirname, ".env");

// Helper function to read X-Hook-Secret from the .env file
function getXHookSecret() {
  const envContent = fs.readFileSync(envFilePath, "utf8");
  const match = envContent.match(/X_HOOK_SECRET=(.*)/);
  return match ? match[1] : "";
}

// Async function to delete the webhook
// Documentation: https://developers.asana.com/reference/deletewebhook
async function deleteWebhook(webhookId, personalAccessToken) {
  const url = `https://app.asana.com/api/1.0/webhooks/${webhookId}`;

  try {
    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${personalAccessToken}`,
      },
    });
    console.log(`Webhook ${webhookId} deleted due to mismatch.`);
  } catch (error) {
    console.error(
      "Error deleting webhook:",
      error.response ? error.response.data : error.message
    );
  }
}

// Async function to create the webhook
// Documentation: https://developers.asana.com/reference/createwebhook
async function createWebhook(targetUri, objectId, filter, resourceType) {
  const personalAccessToken = process.env.PAT;
  const url = "https://app.asana.com/api/1.0/webhooks";

  try {
    const response = await axios.post(
      url,
      {
        data: {
          resource: objectId,
          target: targetUri,
          filters: [{ action: filter, resource_type: resourceType }],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${personalAccessToken}`,
        },
      }
    );

    const xHookSecret = response.data["X-Hook-Secret"];
    const storedSecret = getXHookSecret();

    // Compare the secrets. This check is not solely for detecting mutations in the stored secret.
    // Rather, it ensures that the original secret was valid and corresponds to what Asana expects.
    // Read more about validation during the webhook handshake: https://developers.asana.com/docs/webhooks-guide#the-webhook-handshake
    if (xHookSecret !== storedSecret) {
      console.error(
        `X-Hook-Secrets do not match! Potential security issue. Deleting webhook with GID ${response.data.data.gid}.`
      );
      // Delete the webhook if the secrets don't match
      await deleteWebhook(response.data.data.gid, personalAccessToken);
      return;
    }

    console.log("Webhook created successfully!");
    console.log(
      `The GID of the newly-created webhook is: ${response.data.data.gid}.`
    );
    console.log(
      `The X-Hook-Secret from Asana's '201 Created' response is: ${xHookSecret}.`
    );
  } catch (error) {
    console.error(
      "Error creating webhook:",
      error.response ? error.response.data : error.message
    );
  }
}

// TODO: Replace these values with your target URI, object ID, filter, and resource type
const targetUri = "<YOUR_URL_HERE>/receiveWebhook"; // The webhook server's public endpoint for receiving webhooks (view README for an example)
const objectId = "<OBJECT_ID_HERE>"; // The Asana object ID you want to track (e.g., a task gid)
const filter = "changed"; // The action to filter for (documentation: https://developers.asana.com/docs/webhooks-guide#actions)
const resourceType = "task"; // Specify the resource type (e.g., task, project)

createWebhook(targetUri, objectId, filter, resourceType);

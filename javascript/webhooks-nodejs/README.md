# Webhooks Example (Express - Node.js)

This example server demonstrates how to set up and receive events with [Asana webhooks](https://developers.asana.com/docs/webhooks). In particular, this project demonstrates:

1. Creating a webhook to track changes on a given resource (e.g., a [task](https://developers.asana.com/docs/tasks))
2. Receiving notifications about changes to that task
3. Verifying the integrity of notifications with HMAC signatures

## System Requirements

[Node.js](https://nodejs.org/)

## Installation

1. Navigate to the root directory of this project and install dependencies:

```
npm install
```

2. Download, set up, and run ngrok on your local machine via the official instructions:

```
https://ngrok.com/docs/getting-started/
```

Ngrok is used to create a publicly accessible "tunnel" (i.e., URL) to a port on your local machine. By default, the Express server in this demo runs on port `8080`, so ensure that ngrok is set up to tunnel to the correct port where your server is running.

For example: Using the default settings, then, you can run ngrok on your local machine with the following command:

```
ngrok http 8080
```

## Usage

After ngrok is successfully running, the next steps are to run the server (**index.js**), then establish a webhook using the provided webhook setup script (**createWebhook.js**).

1. Create a file named **.env** in the root directory of this app. In the file, include the following lines:

```
X_HOOK_SECRET=
PAT=
```

You do not need to manually supply a value for `X_HOOK_SECRET`. The Express server writes the `X-Hook-Secret` obtained from the [webhook handshake](https://developers.asana.com/docs/webhooks-guide#the-webhook-handshake) directly into this local file, allowing the `X-Hook-Secret` to persist across server restarts. As such, this server is designed to handle a single `X_HOOK_SECRET`, which is associated with a single webhook.

> **Note:** In a production environment, this value should be securely stored in a database. For security reasons, ensure that you never commit or expose this value in a public repository.

Enter your [personal access token](https://developers.asana.com/docs/personal-access-token) for `PAT`. For your convenience, a sample **.env.template** file is included in the root directory of this application.

2. Start the webhook server:

```
npm run dev
```

3. Edit the **createWebhook.js** setup script to include details for your [POST /webhooks](https://developers.asana.com/reference/createwebhook) request:

```js
// TODO: Replace these values with your target URI, object ID, filter, and resource type
const targetUri = "https://<YOUR_URL_HERE/receiveWebhook"; // The webhook server's public endpoint for receiving webhooks
const objectId = "<OBJECT_ID_HERE"; // The Asana object ID you want to track
const filter = "changed"; // The action to filter for
const resourceType = "task"; // Specify the resource type (e.g., task, project)
```

> **Note:** Make sure to set [`targetUri`](https://developers.asana.com/docs/webhook) parameter to your public ngrok domain instead of a `localhost` domain, such as `http://localhost:8000/receiveWebhook`. This means you must replace `localhost:8000` with your unique ngrok domain. The target URI should be your ngrok server's "Forwarding" domain followed by `/receiveWebhook`. 
> 
> The final value for your target URI will look something like this: `https://0d32-71-236-53-92.ngrok-free.app/receiveWebhook`.

4. Run the setup script to establish the webhook:

```
node createWebhook.js
```

5. In the Asana UI (or via the API), update the resource (e.g., change the task name).

6. The Express server will output webook event notifications in the console about your changes to that resource!

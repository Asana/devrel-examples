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

## Usage

1. Create a file named **.env** in the root directory of this app. In the file, include the following line:

```
X_HOOK_SECRET=
```

The Express server writes the `X-Hook-Secret` obtained from the [webhook handshake](https://developers.asana.com/docs/webhooks-guide#the-webhook-handshake) directly into this local file, allowing the `X-Hook-Secret` to persist across server restarts. As such, this server is designed to handle a single `X_HOOK_SECRET`, which is associated with a single webhook.

> **Note:** In a production environment, this value should be securely stored in a database. For security reasons, ensure that you never commit or expose this value in a public repository.

For your convenience, a sample **.env.template** file is included in the root directory of this application.

2. Start the webhook server:

```
npm run dev
```

3. Create a webhook by calling `POST /webhooks` and specifying given resource (e.g., a task). Feel free to use the [Postman Collection](https://developers.asana.com/docs/using-postman) or the [POST /webhooks](https://developers.asana.com/reference/createwebhook) page in the API Explorer to make your request.

> **Note:** In your request, make sure to set the [`target`](https://developers.asana.com/docs/webhook) parameter to your public ngrok domain instead of the example `localhost` domain, `http://localhost:8000/receiveWebhook`. This means you must replace `localhost:8000` with your unique ngrok domain. The `target` should be your ngrok server's "Forwarding" domain followed by `/receiveWebhook`. 
> 
> The final value for `target` will look something like this: `https://0d32-71-236-53-92.ngrok-free.app/receiveWebhook`.


4. In the Asana UI (or via the API), update the resource (e.g., change the task name).

5. View the ngrok server in the console for notifications of your recent changes on that resource! You can also go to your ngrok server's "Web Interface" URL to see the events notifications in a GUI format.

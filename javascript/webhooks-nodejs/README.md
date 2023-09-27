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
https://dashboard.ngrok.com/get-started/setup

```

ngrok is used to create a publicly-accessible "tunnel" (i.e., URL) to a port on your local machine. Note that by default, the Express server in this demo will run on port `8080`.

## Usage

1. Start the server:

```
npm run dev
```

2. Create a webhook by calling [POST /webhooks](https://developers.asana.com/docs/establish-a-webhook) and specifying given resource (e.g., a task). Feel free to use the [Postman Collection](https://developers.asana.com/docs/using-postman) to make your request.

Note: You must point the [target](https://developers.asana.com/docs/webhook) request parameter to your public ngrok domain instead of the example local host domain `http://localhost:8000/receiveWebhook` (i.e., replace localhost:8000 with your unique ngrok domain). The target will be your ngrok server's "Forwarding" domain appended with `/receiveWebhook` and will look something like `https://0d32-71-236-53-92.ngrok-free.app/receiveWebhook`).

3. In the Asana UI (or via the API), update the resource (e.g., change the task name).

4. View the console for notifications of your recent changes on that resource!

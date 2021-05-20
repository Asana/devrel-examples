# Webhook Inspector

Here is an example that demonstrates the features of [Asana webhooks](https://developers.asana.com/docs/webhooks) and how to properly set them up and receive them. All this script does is to create a webhook and log to your terminal window the contents of webhooks that it receives.

It's built around a simple Flask server that expects to be run behind [ngrok](https://ngrok.com/), a service that creates a tunnel from localhost to their servers. This highlights the first main thing to understand about webhooks:

**Webhooks require a publicly accessible web server to be up and running on the internet at all times.**

If this is an obstacle, we have the much simpler [events](https://developers.asana.com/docs/events) endpoint that allows you to poll for changes instead of react to incoming changes. Webhooks are "Don't call us, we'll call you", but it's often easer to set up scripts as "We won't call you, you call us".

For the purposes of this example, going through ngrok is OK, but it's important to understand that ngrok is not a good solution for production webhooks. From time to time they will close old connections, silently stopping delivery of your webhooks, and they are a man-in-the-middle security concern. For this reason, we suggest you **create a temporary [personal access token](https://developers.asana.com/docs/personal-access-token) to use with this example.**

The script itself has some instructions for getting it up and running, creating the webhook, and viewing the events in the console.

## Security and the Webhook Handshake: What is X-Hook-Secret anyway?

It's optional but recommended for you to use; you can get webhook events without it. It's a security precaution you can take on your end: you have a server up and running that can take incoming requests from just about anywhere. How do you know that there's not an attacker out there spoofing the sort of requests that Asana might be sending you? Webhooks don't have any **inbound** authentication; that is, Asana doesn't have to log in or send an auth token to _your_ server to prove it's Asana.

That's the general purpose of the X-Hook-Secret: it's a random token that Asana creates and stores on our side; then when we respond with webhook events, we calculate a signature in a way that can only be done if we know the secret. You can also calculate this signature client-side (this is optional, but recommended) and if the signatures match, you know it's Asana.

This is secure because the only way for us to create and store the secret is when you request us to - when you first create the webhook. That's why the secret is used for the handshake (and why it's called a handshake, which is a common term in security for exchanging secrets).

- You authenticate with Asana to create the webhook, so Asana knows it's you
- We send you a secret in another request, which you are expecting, since you asked Asana for it with the webhook creation request. You can then store this secret, and we share it on Asana's side and on your client.
- When a future incoming request comes, if the same secret we share calculates the same signature on both sides, then you know that the webhook event is really from Asana.

If you look in that example, you can see that we demonstrate this as well.

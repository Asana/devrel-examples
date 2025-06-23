# Asana API Hello World (Node.js)

This is a quick "Hello World" example that demonstrates how to authenticate with the Asana API using a personal access token (PAT) and retrieve your user information.

## Prerequisites

- [Node.js](https://nodejs.org/) installed
- An Asana [personal access token](https://developers.asana.com/docs/personal-access-token)

## Setup

1. **Clone or copy the script** into a project folder
2. **Install the Asana SDK:**

   ```bash
   npm install asana
   ```

3. **Replace** the placeholder token in the script with your actual Personal Access Token:

   ```js
   token.accessToken = '<PERSONAL_ACCESS_TOKEN>'; // Replace this
   ```

## Run the script

```bash
node index.js
```

You should see output like:

```
Hello world! My name is Ross.
```

## Code overview

This script:

- Initializes the Asana API client
- Authenticates using a personal access token
- Calls the `/users/me` endpoint
- Prints the name of the authenticated user

## Resources

- [Asana developer docs](https://developers.asana.com/docs)
- [Personal access tokens](https://developers.asana.com/docs/personal-access-token)
- [Official Node library](https://github.com/Asana/node-asana)
- [API reference: GET /user/{user_gid}](https://developers.asana.com/reference/getuser) 
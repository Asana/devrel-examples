# Asana node.js SDK + passport sample

This demonstrates how to use Asana's node.js SDK with OAuth using the popular [passport](https://www.passportjs.org/) library and [passport-asana](https://www.passportjs.org/packages/passport-asana/) package.

## Running the app

1. Follow these instructions to [register an Asana application](https://developers.asana.com/docs/oauth#register-an-application)
	1. In step 2, add `http://localhost:3000/auth/asana/callback` as a **Redirect URI**
2. Copy and paste the client id and client secret values into the .env file
3. Run
```
npm install
```
4. Run
```
node index.js
```
5. To see the application working, go to endpoint http://localhost:3000/auth/asana

If things are working, you should be taken to Asana's authorize screen and see the name of your application.

6. Click Allow redirected to http://localhost:3000/me and get a response from Asana's `/users/me` API endpoint.
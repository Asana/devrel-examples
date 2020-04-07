const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const base64url = require('base64-url');
const request = require('request');
const functions = require('firebase-functions');

const challengeMethod = "S256";
const authorizationGrantType = "authorization_code";

const clientId = process.env.client_id;
const clientSecret = process.env.client_secret;
const redirectUri = process.env.redirect_uri;
const frontEndLocation = process.env.front_end_location;
const tokenExchangeEndpoint = process.env.token_exchange_endpoint;

const stateCache = {};

const app = express();

app.use(cookieParser());

// Base endpoint. This should return our html.
app.get('/', (req, res) => {
    console.log('In /');

    request(frontEndLocation).pipe(res);
});

// First step.
// We need to generate state and code verifiers for this client.
// We then return the info the client needs to hit the auth server.
app.get('/first-step-auth', (req, res) => {
    console.log('In first-step-auth');

    const state = getRandomString();
    const codeVerifier = getRandomString();

    // We use crypto to generate sha256 bytes, and we encode them with base64
    let codeChallenge = crypto.createHash('sha256')
        .update(codeVerifier)
        .digest('base64');

    // Because the client will be sending it in the url, lets url encode it for them
    codeChallenge = base64url.escape(codeChallenge);

    // Save that the state and codeVerifier were given to the same person
    stateCache[state] = codeVerifier;

    // Create the result to send to the client
    const result = {
        codeChallenge: encodeURI(codeChallenge),
        challengeMethod: challengeMethod,
        clientId: clientId,
        redirectUri: redirectUri,
        state: state
    };

    // Store state as a cookie on the client
    res.cookie('state', state, {
        maxAge: 15 * 60 * 1000,         // cookie will be removed after 15 min
        httpOnly: true,                 // cookie cannot be read by browser javascript
        secure: true,                   // cookie can only be used with HTTPS
        path: process.env.redirect_uri  // cookie can only be used with our uri
    });

    res.json(result);
});

// Second step.
// We need to get the state and code from the client.
// We will verify the state is valid, and send the code to the auth server.
app.get('/second-step-auth', (req, res) => {
    console.log('In second-step-auth');

    const state = req.cookies.state;

    // This check is used to prevent XSS attacks. If you have implemented PKCE correctly
    // you should not need to do this check, as Asana will protect the user during the token
    // exchange with the codeVerifier.
    if (req.query.state !== state) {
        console.log('Failed state verification');
        res.statusMessage = "State params did not match";
        res.status(401);
        res.send();
        return;
    }

    // The user doesn't need this state anymore
    res.clearCookie("state");

    const code = req.query.code;
    const codeVerifier = stateCache[state];

    const requestBody = {
        grant_type: authorizationGrantType,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        code: code,
    };

    console.log('Requesting token from Asana');
    // Lets ask the auth server for an access token
    request.post(tokenExchangeEndpoint, {
        form: requestBody
    }, (error, responseObj, responseBody) => {
        console.log('In response from Asana');

        if (error) {
            console.error(error);
            res.statusMessage = "Asana did not approve the request.";
            res.status(401);
            res.send();
            return;
        }

        handleNewToken(JSON.parse(responseBody), res);
    });
});

// Handles a response from the auth server.
function handleNewToken(body, res) {
    const accessToken = body.access_token;
    const expiresIn = body.expires_in;
    const userData = body.data;

    // const refreshToken = body.refresh_token;
    // If you want to persist logins, you should use SQL, NoSQL or some other persistent database to store refresh
    // tokens.

    console.log("Storing access token for " + userData.name + " (" + userData.gid + ")");

    res.cookie("access_token", accessToken, {
        maxAge: expiresIn * 1000,       // express uses milliseconds while Asana gives seconds
        path: process.env.redirect_uri  // cookie should only be used with our uri
    });

    res.redirect(redirectUri);
}

// Generates a cryptographically random string
function getRandomString() {
    const randomBytesBuffer = crypto.randomBytes(64);
    return randomBytesBuffer.toString('hex');
}

exports.app = functions.https.onRequest(app);

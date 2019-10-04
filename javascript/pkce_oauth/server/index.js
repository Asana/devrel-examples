const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const base64url = require('base64-url');
const request = require('request');
const functions = require('firebase-functions');

const challengeMethod = "S256";
const authorizationGrantType = "authorization_code";
const refreshGrantType = "refresh_token";

const clientId = process.env.client_id;
const clientSecret = process.env.client_secret;
const redirectUri = process.env.redirect_uri;
const frontEndLocation = process.env.front_end_location;
const tokenExchangeEndpoint = process.env.token_exchange_endpoint;

const stateCache = {};
const tokenCache = {};

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

    console.log(codeVerifier);
    console.log(codeChallenge);

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
        maxAge: 15 * 60000,             // cookie will be removed after 15 min
        httpOnly: true,                 // cookie cannot be read by browser javascript
        secure: true,                   // cookie can only be used with HTTPS
        path: process.env.redirect_uri  // cookie can only be used with our uri
    });

    res.json(result);
});

// Second step.
// We need to get the state and code from the client.
// We will verify the state is valid, and send the code to the auth server.
// We then store the refresh token locally and return the access token to the client.
app.get('/second-step-auth', (req, res) => {
    console.log('In second-step-auth');

    const state = req.cookies.state;

    // This check is used to prevent XSS attacks. If you have implemented PKCE correctly
    // you do not need to do this check, as Asana will protect the user during the token
    // exchange with the codeVerifier.
    if (req.query.state !== state) {
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

    // Lets ask the auth server for an access and refresh token
    request.post(tokenExchangeEndpoint, {
        form: requestBody
    }, (error, responseObj, responseBody) => {
        console.log('In response from Asana');

        if (error) {
            console.error(error);
            res.status(401);
            res.send();
            return;
        }

        console.log(codeVerifier);
        console.log(responseObj);

        handleNewToken(JSON.parse(responseBody), res);
    });
});

// This allows the front end app to request a new token if their current token is not expired
app.get('/refresh-token', (req, res) => {
    console.log('In refresh-token');

    const access_token = req.cookies.access_token;
    const refreshTokenObj = tokenCache[access_token];

    if (refreshTokenObj !== null) {
        const requestBody = {
            grant_type: refreshGrantType,
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshTokenObj.refreshToken,
        };

        // Ask the auth server for a new token
        request.post(tokenExchangeEndpoint, {
            form: requestBody
        }, (error, responseObj, responseBody) => {
            if (error) {
                console.error(error);
                res.status(401);
                res.send();
                return;
            }

            handleNewToken(JSON.parse(responseBody), res);
        });
    } else {
        res.statusCode = '401';
        res.send();
    }
});

// Handles a response from the auth server.
function handleNewToken(body, res) {
    console.log(body);

    const accessToken = body.access_token;
    const expiresIn = body.expires_in;
    const refreshToken = body.refresh_token;
    const userData = body.data;

    console.log("Storing access & refresh token for " + userData.name + " (" + userData.gid + ")");

    res.cookie("access_token", accessToken);

    tokenCache[accessToken] = {
        createdAt: Date.now(),
        expiresIn: expiresIn,
        refreshToken: refreshToken
    };

    res.redirect(redirectUri);
}

// Generates a cryptographically random string
function getRandomString() {
    const randomBytesBuffer = crypto.randomBytes(64);
    return randomBytesBuffer.toString('hex');
}

exports.app = functions.https.onRequest(app);

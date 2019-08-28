const express = require('express');
const cookieParser = require('cookie-parser');
const sha256 = require('js-sha256');
const request = require('request');
const functions = require('firebase-functions');

const challengeMethod = "SHA256";
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

    let result = {};

    let state = getRandomToken();
    let codeVerifier = getRandomToken();
    let codeChallenge = sha256(codeVerifier);

    // Save that the state and codeVerifier were given to the same person
    stateCache[state] = codeVerifier;

    // Supply the client with the OAuth data
    result.codeChallenge = codeChallenge;
    result.challengeMethod = challengeMethod;
    result.clientId = clientId;
    result.redirectUri = redirectUri;
    result.state = state;

    // Store state as a cookie on the client
    res.cookie("state", state);

    res.json(result);
});

// Second step.
// We need to get the state and code from the client.
// We will verify the state is valid, and send the code to the auth server.
// We then store the refresh token locally and return the access token to the client.
app.get('/second-step-auth', (req, res) => {
    console.log('In second-step-auth');

    let state = req.query.state;

    // Confirm the given state matches the state in the user's cookies
    if (state !== req.cookies.state) {
        res.status(401);
        res.send();
        return;
    }

    // The user doesn't need this state anymore
    res.clearCookie("state");

    let code = req.query.code;
    let codeVerifier = stateCache[state];

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
        console.log('In response from asana');

        if (error) {
            console.error(error);
            res.status(401);
            res.send();
            return;
        }

        handleNewToken(JSON.parse(responseBody), res);
    });
});

// This allows the front end app to request a new token if their current token is not expired
app.get('/refresh-token', (req, res) => {
    console.log('In refresh-token');

    let access_token = req.cookies.access_token;
    let refreshTokenObj = tokenCache[access_token];

    // If this token is not expired, refresh it
    if (refreshTokenObj != null && Date.now() - refreshTokenObj.createdAt < refreshTokenObj.expiresIn) {
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
    let accessToken = body.access_token;
    let expiresIn = body.expires_in;
    let refreshToken = body.refresh_token;
    let userData = body.data;

    console.log("Storing access & refresh token for " + userData.name + " (" + userData.gid + ")");

    res.cookie("access_token", accessToken);

    tokenCache[accessToken] = {
        createdAt: Date.now(),
        expiresIn: expiresIn,
        refreshToken: refreshToken
    };

    res.redirect(redirectUri);
}

// Generates a random string of a bigger size
function getRandomToken() {
    return getRandomSmallToken() + getRandomSmallToken();
}

// Generates a random string
function getRandomSmallToken() {
    let randomNumber = Math.random();

    while (randomNumber === 0) {
        randomNumber = Math.random();
    }

    return randomNumber.toString(36).substr(2);
}

exports.app = functions.https.onRequest(app);

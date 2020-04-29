const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const base64url = require('base64-url');
const request = require('request');

const challengeMethod = "S256";
const authorizationGrantType = "authorization_code";

const clientId = process.env.client_id;
const clientSecret = process.env.client_secret;
const oauthAuthorizeEndpoint = process.env.oauth_authorize_endpoint;
const tokenExchangeEndpoint = process.env.token_exchange_endpoint;

const stateCache = {};

const app = express();

app.use(cookieParser());

// Enable CORS and assume the allowed origins are the redirect uris.
// If your client shares the same domain as the server, you should remove this
const allowedOrigins = process.env.redirect_uri.split(',');
app.use(cors({
    credentials: true,
    origin: function(origin, callback){
        // allow requests with no origin
        // (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1 && allowedOrigins.indexOf(origin + '/') === -1){
            var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

// Base endpoint. This should return our html.
app.get('/*', (req, res) => {
    console.log('In /');

    const state = req.cookies.state;

    if (!state) {
        console.log('In first-step-auth');

        const redirectUri = getRedirectUri(req);
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

        // Store state as a cookie on the client
        res.cookie('state', state, {
            maxAge: 15 * 60 * 1000,         // cookie will be removed after 15 min
            httpOnly: true,                 // cookie cannot be read by browser javascript
            secure: true                    // cookie can only be used with HTTPS
        });

        // Redirect the client
        res.redirect(oauthAuthorizeEndpoint +
            "?client_id=" + clientId +
            "&code_challenge=" + encodeURIComponent(codeChallenge) +
            "&code_challenge_method=" + challengeMethod +
            "&redirect_uri=" + encodeURIComponent(redirectUri) +
            "&response_type=" + "code" +
            "&state=" + state);
    } else {
        console.log('In second-step-auth');

        // The user doesn't need the state cookie anymore
        res.clearCookie("state");

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

        const redirectUri = getRedirectUri(req);
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

            handleNewToken(JSON.parse(responseBody), req, res);
        });
    }
});

// Handles a response from the auth server.
function handleNewToken(body, req, res) {
    const accessToken = body.access_token;
    const expiresIn = body.expires_in;
    const userData = body.data;

    // const refreshToken = body.refresh_token;
    // If you want to persist logins, you should use SQL, NoSQL or some other persistent database to store refresh
    // tokens.

    console.log("Returning access token for " + userData.name + " (" + userData.gid + ")");

    // This server allows for a redirect flow, and a request flow for token exchange. We determine which flow to use
    // depending on this query param.
    if (req.query.no_redirect) {
        const result = {
            accessToken: accessToken,
            expiresIn: expiresIn,
            userData: userData
        };

        res.json(result);
    } else {
        res.cookie("access_token", accessToken, {
            maxAge: expiresIn * 1000,       // express uses milliseconds while Asana gives seconds
        });

        res.redirect(getRedirectUri(req));
    }
}

// Allows for multiple redirect_uri locations if defined in our environment variables. Defaults to first one.
function getRedirectUri(req) {
    const redirectUriOptions = process.env.redirect_uri.split(',');
    const requestedRedirectUri = req.query.redirect_uri;

    if (requestedRedirectUri && redirectUriOptions.includes(requestedRedirectUri)) {
        return requestedRedirectUri;
    } else {
        return redirectUriOptions[0];
    }
}

// Generates a cryptographically random string
function getRandomString() {
    const randomBytesBuffer = crypto.randomBytes(64);
    return randomBytesBuffer.toString('hex');
}

module.exports.handler = serverless(app);

const serverless = require('serverless-http');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const request = require('request');

const clientSecret = process.env.client_secret;
const tokenExchangeEndpoint = process.env.token_exchange_endpoint;

const app = express();

// We can read cookies
app.use(cookieParser());

// We accept json and form encoded bodys
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS and assume the allowed origins are the redirect uris.
// If your client shares the same domain as the server, you should remove this
const allowedOrigins = (process.env.redirect_uri || "").split(',');
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

// Token exchange endpoint.
app.post('/*', (req, res) => {
    console.log('In /');

    let body = req.body;

    body.client_secret = clientSecret;

    // If we're refreshing a token, only trust the cookie refresh token
    if (body.grant_type === "refresh_token") {
        body.refresh_token = req.cookies.refresh_token;
    }

    // Lets ask the auth server for an access token
    request.post(tokenExchangeEndpoint, {
        form: body
    }, (error, responseObj, responseBody) => {
        console.log('In response from Asana');

        if (error) {
            console.error(error);
            res.statusMessage = "Asana did not approve the request.";
            res.status(401);
            res.send();
            return;
        }

        let tokenResponse = JSON.parse(responseBody);

        // Browser Javascript should not see the refresh token, so lets strip it
        // out and add it as an httpOnly cookie.
        res.cookie("refresh_token", tokenResponse.refresh_token, {
            httpOnly: true,  // dont let browser javascript access cookie ever
            secure: true
        });
        delete tokenResponse.refresh_token;

        // For our purpose, we will give the user their access_token, so they can
        // make calls straight to Asana from the browser.
        res.send(tokenResponse);
    });
});

module.exports.handler = serverless(app);

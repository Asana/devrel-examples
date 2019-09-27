This example shows how to get started with the confidential client authorization code flow. For this tutorial, we will 
utilize the (Always Free)[https://cloud.google.com/free/] offerings of Google Cloud, but you can alter this to use any
server you prefer.

This is useful for apps that don't need/want a server, but need to allow secure logins.

### Basics

You can read more about what OAuth is in this [blog post from Okta](https://developer.okta.com/blog/2017/06/21/what-the-heck-is-oauth).

The moving parts
* A Client (Browser)
* An App Server (Google function, Amazon Lambda, or a full server)
* An Authorization Server (Asana)

Here is a simplified rundown of the steps we will complete:

1. A Browser (the Client) goes to your App Server URL to get a webpage.
2. The Client clicks `Authenticate with Asana` on your webpage.
3. Your webpage asks your App Server to create state and return some required oauth info.
4. Your webpage redirects the Client to Asana's authorization endpoint.
5. The Client clicks `Accept` at Asana's authorization endpoint.
6. Asana redirects the Client back to your App Server with a code.
7. The App Server returns your webpage, which tells the Client how to handle this code.
8. Your webpage sends the code to your App Server
9. Your App Server sends the code to Asana.
10. Asana returns an access_token
11. Your app server gives the user the access_token

Sounds easy, right?

Lets start with a server. 

For this example we're going to use google cloud functions. Why? Because they're an easy way to satisfy the server requirement without much overhead. And until you get too much traffic, they're free!

## The Server

1. Login to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a [Cloud Function](https://cloud.google.com/functions/docs/quickstart-console)
  1. 256 MB memory allocated.
  2. Trigger should be HTTP
  3. Inline Editor
  4. Node.js 8
3. Create a basic app.
  1. For index.js, put in this:
```javascript
const express = require('express');
const functions = require('firebase-functions');

const app = express();

const stateCache = {};

// Base endpoint. This should return our html.
app.get('/', (req, res) => {
    console.log('In /');
  
    res.send("Hello World");
});

exports.app = functions.https.onRequest(app);
```
  2. For package.json, put in this: 
```json
{
  "name": "example-app",
  "version": "0.0.1",
  "description": "This is an example google function app",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Your Name",
  "license": "ISC",
  "dependencies": {
    "express": "^4.17.1",
    "firebase-admin": "^8.3.0",
    "firebase-functions": "^3.2.0"
  }
}
```
4. Hit Deploy.
5. Go to the URL under the Trigger tab, and click on it!

Lets talk about what our code is doing. We require some packages, create our express app, and then handled the '/' path. 

We needed to require firebase-functions (and -admin) to enable Google Functions to correctly handle an express app.

### Expand our app server's endpoints

There's 3 major paths that the App Server needs to handle:

1. Return our webpage (We will hold off on this for now)
2. Generate/supply some parameters and state (First Auth Step)
3. Exchange the code for a token from Asana (Second Auth Step)

Lets make a path to handle each of those:
```javascript
app.get('/', (req, res) => {
    console.log('In /');

    res.send('Hello World');
});

app.get('/first-step-auth', (req, res) => {
    console.log('In first-step-auth');

    res.send('Hello World');
});

app.get('/second-step-auth', (req, res) => {
    console.log('In second-step-auth');
    
    res.send('Hello World');
});
```

### Expand the First Auth Step

Now throw all this code into your '/first-step-auth' endpoint, and lets talk about it:
```javascript
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
```

Here's what all of these variables mean:
* `result` is going to be what we return
* `state` is a random token. We will use this to connect the person who hit /first-step-auth with the one who hits /second-step-auth
  * You might not need `state` if you require users to login to your app before performing oauth, because their login can be used to prove the person's identity.
* `stateCache` is going to be the only storage we use for this app. This is wiped when the server restarts, so we need to keep that in mind. (If you have a database set up, you can/should use that in place of this)
* `codeVerifier` is a random token. We will not show the user this token, as it's going to prove to Asana that we are the same App during some other steps.
* `codeChallenge` is a sha256 encryption of our codeVerifier (a one-way encryption). This way, we can expose it to the user, but they can't find out our `codeVerifier`.
* `challengeMethod` will be set to "S256" to describe how we hashed our challenge.
* `clientId` is the client_id our app. This lets Asana know which app we are.
* `redirectUri` is the redirectUri we whitelisted on our app in Asana.

In order for our `getRandomToken()` function to work, we should declare it. Create a function below (outside of any `app.get`) and paste in:
```javascript
// Generates a random string
function getRandomToken() {
    return getRandomSmallToken() + getRandomSmallToken();
}

// Generates a small random string
function getRandomSmallToken() {
    let randomNumber = Math.random();

    while (randomNumber === 0) {
        randomNumber = Math.random();
    }

    return randomNumber.toString(36).substr(2);
}
```

In order for our `sha256` function to work, we need to import the library. Run `npm install js-sha256` and at the top of the function, add:
```javascript
const sha256 = require('js-sha256');
```

While we're here, lets add some other constants:
```javascript
const challengeMethod = "S256";

const clientId = process.env.client_id;
const redirectUri = process.env.redirect_uri;
```

`process.env.~` lets us declare these variables in our environment instead of in code. In Google Cloud, while editing your function, you can hit "Advanced Features" and set these variables. We do this later.

#### 1 step done, 1 step to go.
So right now we have an endpoint that our webpage will hit. This endpoint will give the webpage the info it needs to 
start the OAuth flow with Asana. We also stored a `code_verifier` and tied it to the user via `state`.

The server gives the client the `code_challenge`, `challenge_method`, `client_id`, and `redirectUri`. It also 
sets a cookie on the webpage to hold `state`. If we prefer, we could have the webpage store the `client_id`, the 
`redirectUri` and the `challenge_method`. For now, lets keep it on the server, so we only have to update data in 1 
location.


### Expand the Second Auth Step.
Now throw all this code into your '/second-step-auth' endpoint, and lets talk about it:
```javascript
app.get('/first-step-auth', (req, res) => {
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
```

Here's what the new variables mean:

* `code` is a random code that Asana gave the webpage. This is what we will use to get a token.
* `client_secret` is the secret (or password) of our app. This proves that we are the app we're claiming to be.
* `grant_type` tells Asana what kind of authorization we're performing.

In this function, we're confirming that the cookie state we gave the webpage is the same state that they're passing us 
now. This proves to us that the webpage who hit our `/first-step-auth` endpoint is the same one that hit our 
`/second-step-auth` endpoint. This is to prevent 
[CSRF Attacks](https://auth0.com/docs/protocols/oauth2/mitigate-csrf-attacks).

We'll need to do some installs and imports. Run `npm install cookie-parser` to allow express to read cookies, and run 
`npm install request` for an easy-to-use package for sending requests.

```javascript
const cookieParser = require('cookie-parser');
const request = require('request');
```

We'll also need to set some more constants at the top:

```javascript
const clientSecret = process.env.client_secret;
const tokenExchangeEndpoint = process.env.token_exchange_endpoint;

const tokenCache = {};
```

And tell our express app to use the cookie parser:

```javascript
const app = express();   // <--- You should already have this line
app.use(cookieParser());
```

Next, we're going to tell Asana we're ready for a token. We will send this json body to the `tokenExchangeEndpoint`.

```
{
  grant_type: authorizationGrantType, // What type of authorization we're performing
  client_id: clientId,                // Who we are
  client_secret: clientSecret,        // Proof that we are who we say we are
  code_verifier: codeVerifier,        // Proof that we're the same app that started this flow.
  redirect_uri: redirectUri,          // Proof of which redirectUri we use
  code: code,                         // The code that lets us get a token
}
```

Finally, we handle the response from Asana! Add this function below all of your `app.get`.

```javascript
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
```

This function grabs all of the variables we want to use from response body. It sets the `access_token` as a cookie for 
the user, and then stores the `refresh_token` (and some other data) in our `tokenCache`. In most cases, the `tokenCache` 
should be a secure database instead of a simple cache. This is because the `refresh_token` is what allows you to keep a
user logged in to your app, without having them re-authenticate with Asana every hour. More specifically, when your 
cache is wiped, you lose all of your refresh tokens.

**Note**: If your app does not need `refresh_token` logic, you can remove the `tokenCache` and all the surrounding 
logic. This is simpler, but it means users will have to re-login every hour they're using the app. However, re-login is 
usually quick, as they do not have to explicitly click "Allow" on Asana when they have already allowed it.

The final thing this function does is redirect the user back to the redirectUri.

### Last but not least

Let's have our root url return our website!

```javascript
app.get('/', (req, res) => {
    console.log('In /');

    request(frontEndLocation).pipe(res);
});
```

This variable will be our final const:

```javascript
const frontEndLocation = process.env.front_end_location;
```

And that's it! Our server is done. If you haven't already, update your Google function with all of this code, and lets 
move over to building our webpage.

## The Webpage

This webpage is going to be our front end. This is an over-simplified website that we will use to prove the OAuth
steps work as expected.

We're going to use a single `index.html` file for this for simplicity.

Let's create an `index.html` and throw in some basics:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>MyApp</title>
</head>
<body>
</body>
</html>
```

In the body, lets put in some divs. Each div will represent a different state that the app can get into during the oauth:

```html
<body>
    <div id="unauthenticated-holder" style="display: none;">
        <button id="auth-with-asana-button">Authenticate with Asana</button>
    </div>
    <div id="loading-holder" style="display: none">
        <div class="lds-dual-ring"></div>
    </div>
    <div id="authenticated-holder" style="display: none;">
        <p>Congrats! You're authenticated!</p>
        <button id="clear-auth">Clear Auth Cookie</button>
    </div>
    <div id="error-holder" style="display: none;">
        <p id="error-text">Something failed!</p>
    </div>
</body>
```

Let's add some basic style to our loading icon. A gif loading icon is the heart of any quality app:

```html
    ...
    <style>
        .lds-dual-ring {
            display: inline-block;
            width: 64px;
            height: 64px;
        }
        .lds-dual-ring:after {
            content: " ";
            display: block;
            width: 46px;
            height: 46px;
            margin: 1px;
            border-radius: 50%;
            border: 5px solid;
            border-color: #000 transparent #000 transparent;
            animation: lds-dual-ring 1.2s linear infinite;
        }
        @keyframes lds-dual-ring {
            0% {
                transform: rotate(0deg);
            }
            100% {
                transform: rotate(360deg);
            }
        }
    </style>
</head>
```

Finally, lets add a script tag that will do all of the work. Lets add some helper functions to start:

```html
...</title>
<script>
    window.onload = function () {
        function getCookie(name) {
            var value = "; " + document.cookie;
            var parts = value.split("; " + name + "=");
            if (parts.length === 2) return parts.pop().split(";").shift();
        }

        function deleteCookie(name) {
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }

        function handleError(error_message) {
            var error = document.getElementById("error-holder");
            var errorText = document.getElementById("error-text");

            error.style.display = "block";
            errorText.innerText = error_message;
        }
    }
</script>
<style>
    ...
```

* window.onload means we will wait for the page to load before we start running javascript.
* getCookie(name) is a function that will read a cookie value for us.
* deleteCookie(name) is a function that will delete a cookie for us.
* handleError(error_message) is a function that will display an error to the user. This simply shows the 'error' div and
  sets the text in it.
  
First, lets grab all of the data that might be relevant:

```javascript
window.onload = function() {
    let url = new URL(window.location.href);
    let code = url.searchParams.get("code");
    let state = url.searchParams.get("state");

    let access_token = getCookie("access_token");
    
    ...
```

And now, lets decide what to do depending on what data we have.

### Logged in scenario

First, lets handle the logged in view. To keep it simple, lets check if we have an `access_token`, and treat that as 
proof that we're logged in.

```javascript
...
let access_token = getCookie("access_token");

if (access_token) {
  let authenticated = document.getElementById("authenticated-holder");
  authenticated.style.display = "block";

  let clear_auth_button = document.getElementById("clear-auth");

  clear_auth_button.onclick = function () {
    deleteCookie("access_token");

    window.location.reload();
  }
}

function getCookie(name) { 
...
```

All we're doing here is showing the div `authenticated-holder`, and listening for a click event that will clear our 
login.

### Halfway OAuth Scenario

The next thing we should handle is the `code` scenario. This is when Asana has redirected the browser to this url and 
supplied a `code`.

```javascript
...
    window.location.reload();
  }
} else if (code) {
  let loading = document.getElementById("loading-holder");
  loading.style.display = "block";
    
  let request = new Request('https://us-central1-my-app.cloudfunctions.net/my-app-function/second-step-auth?code='+code+"&state="+state, {
    method: 'GET'
  });
    
  fetch(request)
    .then(function (response) {
       if (!response.ok) {
         handleError(response.statusText);
         return;
       }
    
       console.log("We should be logged in.");
    
       // Reload the page without the query params
       window.location = window.location.href.split("?")[0];
    })
}

function getCookie(name) { 
...
```

All we do here is show the `loading-holder`, and send a request to our App Server with the code & state given to us by
Asana. When this request finishes, we should be logged in.

### Unauthenticated Scenario

The last thing we need to handle is when an unauthenticated user comes to the webpage.

```javascript
...
    window.location.reload();
  }
} else {
  let unauthenticated = document.getElementById("unauthenticated-holder");
  unauthenticated.style.display = "block";

  let auth_button = document.getElementById("auth-with-asana-button");
  auth_button.onclick = function () {
    var request = new Request('https://us-central1-my-app.cloudfunctions.net/my-app-function/first-step-auth', {
      method: 'GET'
    });

    fetch(request)
      .then(function (response) {
        if (!response.ok) {
          handleError(response.statusText);
          return;
        }

        response.json().then(function(data) {
            document.cookie = "state=" + data.state + ";expires=3600;path=/";

            window.location.href = "https://app.asana.com/-/oauth_authorize" +
              "?client_id=" + data.clientId +
              "&code_challenge=" + data.codeChallenge +
              "&challenge_method=" + data.challengeMethod +
              "&redirect_uri=" + data.redirectUri +
              "&response_type=" + "code" +
              "&state=" + getCookie("state") +
              "&display_ui=always"; // Only include this if you want to see the Asana "Allow" screen every time you auth.
            });
        });
    }
}

function getCookie(name) { 
...
```

Although this function is larger than the others, it's also quite simple. 

The first thing we do is show the `unauthenticated-holder` div. We then set up an onclick for the button in that div.

This onclick will send a request to `/first-step-auth` on our App Server, asking for the data it needs to sends to 
Asana. Once we hear back from the App Server, the browser can redirect itself to Asana, with the correct data set as 
params in the url.

## Almost done!

You've finished all the code. The last thing to do is to set things up. Take your 
`index.html` file, and host it on Google Storage. It's easiest to follow their 
[tutorial](https://cloud.google.com/storage/docs/hosting-static-website) (Skip the CNAME section).

Once completed you should be able to go to your site at the url 
storage.googleapis.com/{bucket-name}/index.html. If you're unable to, debug your public access settings. The tutorial 
should talk you through this.

Once you're able to find your website at that url, go back to your Google Cloud Function. Edit it, and go to 
`Environment Variables`. Here, you should set 5 of them.

```
client_id: {Your client id from Asana}
client_secret: {Your client secret from Asana}
redirect_uri: {The URL of this function. You can find it near the top}
front_end_location: {The URL of your index.html in the Google Storage Bucket}
token_exchange_endpoint: "https://app.asana.com/-/oauth_token"
```

At the bottom, hit deploy!

## All done!

Now copy the url of your google function and paste it in your url. Viola! You should see your index.html, and you should
be able to successfully login using OAuth!

## Issues

If you have any issues with this, please create an Issue in this github repo. Common issues will be placed here to help 
others!

require("dotenv").config();
const axios = require("axios");
const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();

// Enable CORS and assume the allowed origin is the redirect URI.
// i.e., this assumes that your client shares the same domain as the server.
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

// Enable storage of data in cookies.
// Signed cookies are signed by the COOKIE-SECRET environment variable.
app.use(cookieParser(process.env.COOKIE_SECRET));

// Serve files in the ./static folder.
app.use(express.static("static"));

// Send static index.html page to the client.
// This page includes a button to authenticatate with Asana.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/static/index.html"));
});

// When the user clicks on the "Authenticate with Asana" button (from index.html),
// it redirects them to the user authorization endpoint.
// Docs: https://developers.asana.com/docs/oauth#user-authorization-endpoint
app.get("/authenticate", (req, res) => {
  // Generate a `state` value and store it
  // Docs: https://developers.asana.com/docs/oauth#response
  let generatedState = uuidv4();

  // Expiration of 5 minutes
  res.cookie("state", generatedState, {
    maxAge: 1000 * 60 * 5,
    signed: true,
  });

  res.redirect(
    `https://app.asana.com/-/oauth_authorize?response_type=code&client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&state=${generatedState}`
  );
});

// Redirect the user here upon successful or failed authentications.
// This endpoint on your server must be accessible via the redirect URL that you provided in the developer console.
// Docs: https://developers.asana.com/docs/oauth#register-an-application
app.get("/oauth-callback", (req, res) => {
  // Prevent CSRF attacks by validating the 'state' parameter.
  // Docs: https://developers.asana.com/docs/oauth#user-authorization-endpoint
  if (req.query.state !== req.signedCookies.state) {
    res.status(422).send("The 'state' parameter does not match.");
    return;
  }

  console.log(
    "***** Code (to be exchanged for a token) and state from the user authorization response:\n"
  );
  console.log(`code: ${req.query.code}`);
  console.log(`state: ${req.query.state}\n`);

  // Body of the POST request to the token exchange endpoint.
  const body = {
    grant_type: "authorization_code",
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI,
    code: req.query.code,
  };

  // Set Axios to serialize the body to urlencoded format.
  const config = {
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
  };

  // Make the request to the token exchange endpoint.
  // Docs: https://developers.asana.com/docs/oauth#token-exchange-endpoint
  axios
    .post("https://app.asana.com/-/oauth_token", body, config)
    .then((res) => {
      console.log("***** Response from the token exchange request:\n");
      console.log(res.data);
      return res.data;
    })
    .then((data) => {
      // Store tokens in cookies.
      // In a production app, you should store this data somewhere secure and durable instead (e.g., a database).
      res.cookie("access_token", data.access_token, { maxAge: 60 * 60 * 1000 });
      res.cookie("refresh_token", data.refresh_token, {
        // Prevent client-side scripts from accessing this data.
        httpOnly: true,
        secure: true,
      });

      // Redirect to the main page with the access token loaded into a URL query param.
      res.redirect(`/?access_token=${data.access_token}`);
    })
    .catch((err) => {
      console.log(err.message);
    });
});

app.get("/get-me", (req, res) => {
  // This assumes that the access token exists and has NOT expired.
  if (req.cookies.access_token) {
    const config = {
      headers: {
        Authorization: "Bearer " + req.cookies.access_token,
      },
    };

    // Below, we are making a request to GET /users/me (docs: https://developers.asana.com/reference/getuser)
    //
    // If the request returns a 401 Unauthorized status, you should refresh your access token (not shown).
    // You can do so by making another request to the token exchange endpoint, this time passing in
    // a 'refresh_token' parameter (whose value is the actual refresh token), and also setting
    // 'grant_type' to 'refresh_token' (instead of 'authorization_code').
    //
    // Docs: https://developers.asana.com/docs/oauth#token-exchange-endpoint
    //
    // If using Axios, you can implement a refresh token mechanism with interceptors (docs: https://axios-http.com/docs/interceptors).
    axios
      .get("https://app.asana.com/api/1.0/users/me?opt_pretty=true", config)
      .then((res) => res.data)
      .then((userInfo) => {
        console.log("***** Response from GET /users/me:\n");
        console.log(JSON.stringify(userInfo, null, 2));

        // Send back a JSON response from GET /users/me as JSON (viewable in the browser).
        res.json(userInfo);
      });
  } else {
    res.redirect("/");
  }
});

// Start server on port 3000.
app.listen(3000, () =>
  console.log("Server started -> http://localhost:3000\n")
);

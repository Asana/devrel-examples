/**
 * This is a minimal demo of how to implement OAuth with Asana using Node.js + Express.
 * 
 * It walks through:
 *   - Redirecting the user to Asana's authorization URL
 *   - Handling the OAuth callback and exchanging the code for tokens
 *   - Using the access token to make a basic API call (GET /users/me)
 * 
 * Tokens are stored in cookies for simplicity in this local-only demo.
 * In a real production app, tokens should be stored securely on the server (e.g., in a database),
 * never exposed to client-side JavaScript (via cookies or localStorage),
 * and refresh tokens should be kept httpOnly and encrypted if possible.
 * 
 * For official Asana docs, see: https://developers.asana.com/docs/oauth
 */

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS with secure configuration
app.use(cors({ 
  origin: process.env.ALLOWED_ORIGINS || "http://localhost:3000", 
  methods: ["GET", "POST"],
  credentials: true,
  optionsSuccessStatus: 204
}));

// Parse cookies, including signed cookies (used to validate state during OAuth flow)
app.use(cookieParser(process.env.COOKIE_SECRET));

// Serve static HTML and assets from the "static" directory
app.use(express.static("static"));

// Serve landing page with "Authenticate with Asana" button
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/static/index.html"));
});

/**
 * This route is triggered when the user clicks "Authenticate with Asana".
 * It generates a CSRF-protection `state`, stores it in a signed cookie,
 * and redirects the user to Asana's authorization URL to begin the OAuth flow.
 *
 * Docs: https://developers.asana.com/docs/oauth#user-authorization-endpoint
 */
app.get("/authenticate", (req, res) => {
  const state = crypto.randomUUID();

  // Store state in a signed cookie to protect against CSRF.
  res.cookie("state", state, {
    maxAge: 5 * 60 * 1000, // 5 minutes
    signed: true,
    sameSite: "lax",
  });

  // Hard-coded redirect URI for demo simplicity
  const redirectUri = "http://localhost:3000/oauth-callback";
  const authUrl = `https://app.asana.com/-/oauth_authorize?response_type=code&client_id=${process.env.CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}`;
  res.redirect(authUrl);
});

/**
 * This is the redirect URI that Asana will call after the user approves access.
 * It receives an authorization `code` and the previously generated `state`.
 * We validate the state to protect against CSRF, then exchange the code for tokens.
 *
 * Docs: https://developers.asana.com/docs/oauth#token-exchange-endpoint
 */
app.get("/oauth-callback", async (req, res) => {
  const { code, state } = req.query;

  // Prevent CSRF by validating the returned state matches the stored cookie
  if (state !== req.signedCookies.state) {
    return res.status(422).send("Invalid state parameter.");
  }

  try {
    // Exchange the authorization code for access and refresh tokens
    const response = await axios.post(
      "https://app.asana.com/-/oauth_token",
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: "http://localhost:3000/oauth-callback",
        code,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, refresh_token } = response.data;

    // Store tokens in cookies with httpOnly and secure flags for security
    res.cookie("access_token", access_token, {
      maxAge: 60 * 60 * 1000, // 1 hour
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });

    res.cookie("refresh_token", refresh_token, {
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });

    // WARNING: Including tokens in URLs is insecure (browser history, logs)
    // For production:
    // 1. Remove token from URL
    // 2. Use server-side sessions instead
    // 3. Make API calls only from server-side code using httpOnly cookies
    res.redirect(`/?access_token=${access_token}`);
  } catch (err) {
    console.error("Token exchange failed:", err.response?.data || err.message);
    res.status(500).send("Failed to authenticate.");
  }
});

/**
 * Get current user's info from Asana using GET /users/me.
 * This route uses the access token stored in cookies.
 *
 * Docs: https://developers.asana.com/reference/getuser
 *
 * Note: This demo does NOT implement token refresh.
 * If the access token has expired, you'll get a 401 response.
 * In production, you should use the refresh token to request a new access token:
 * https://developers.asana.com/docs/oauth#token-exchange-endpoint
 *
 * If you're using Axios, you can implement a token refresh mechanism
 * using Axios interceptors: https://axios-http.com/docs/interceptors
 */
app.get("/get-me", async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).send("Access token missing.");

  try {
    const response = await axios.get("https://app.asana.com/api/1.0/users/me?opt_pretty=true", {
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json(response.data);
  } catch (err) {
    console.error("Failed to fetch user info:", err.response?.data || err.message);
    res.status(500).send("Failed to fetch user info.");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

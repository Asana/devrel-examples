const QUERY_PARAMS = new URLSearchParams(window.location.search);
const ACCESS_TOKEN = QUERY_PARAMS.get("access_token");

// If an access token exists in the query params (i.e., suggesting successful auth)
if (ACCESS_TOKEN) {
  // Hide the content from the unauthorized state (i.e., "Authenticate with Asana")
  document.getElementById("unauthorized-body").style.display = "none";
  // Show the content from the authorized state (i.e., "Success!")
  document.getElementById("authorized-body").style.display = "flex";
}

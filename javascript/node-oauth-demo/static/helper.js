const QUERY_PARAMS = new URLSearchParams(window.location.search);
const ACCESS_TOKEN = QUERY_PARAMS.get("access_token");

if (ACCESS_TOKEN) {
  document.getElementById("unauthorized-body").style.display = "none";
  document.getElementById("authorized-body").style.display = "flex";

  // Store the token in memory (not cookies)
  sessionStorage.setItem("access_token", ACCESS_TOKEN);

  // Clean up the URL to remove the token from the address bar
  window.history.replaceState({}, document.title, "/");
}

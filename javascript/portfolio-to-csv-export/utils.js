// ================================================
// Fetching and parsing data
// ================================================

// extractProjectsFromPortfolio() returns a list of all projects under that portfolio (including projects in nested portfolios)
// This is a recursive function that takes in:
// - A portfolio GID
// - Default HTTP headers (including authorization)
async function extractProjectsFromPortfolio(portfolio_gid, httpHeaders) {
  try {
    // Get all items from the portfolio
    let items = await getAsanaPortfolioItems(portfolio_gid, {
      headers: httpHeaders,
    });
    let projects = [];
    let portfolioPromises = [];

    // Iterate through items
    for (let item of items) {
      // If the item is a project, flatten/map the standard project fields, then add it to our list of projects
      if (item["resource_type"] === "project") {
        let newItem = { ...flattenProjectFields(item) };
        projects.push(newItem);
      } else if (item["resource_type"] === "portfolio") {
        // If the item is a portfolio, run extractProjectsFromPortfolio() recursively
        portfolioPromises.push(
          extractProjectsFromPortfolio(item["gid"], httpHeaders)
        );
      }
    }

    // Wait for all the nested portfolio responses to come back...
    let portfolioResults = await Promise.all(portfolioPromises);
    // ...then add those projects to the list
    projects.push(...portfolioResults.flat(3));

    // Since the above operation can create nested arrays, we flatten them out
    // The returned value is an array of objects, each representing a project
    return projects.flat(3);
  } catch (error) {
    console.log(error);
    postError(
      "Something went wrong... inpect the page to view the dev console or wait and try again"
    );
  }
}

// getAsanaPortfolioItems() makes a request against the Asana API to get all the projects and portfolios from a portfolio
// Documentation: https://developers.asana.com/reference/getitemsforportfolio
async function getAsanaPortfolioItems(portfolio_gid, headers) {
  // Max retries for rate limited calls
  // For more information on rate limits, see: https://developers.asana.com/docs/rate-limits
  const maxRetries = 10;
  let retryCounter = 0;

  // While we haven't finished the request, keep trying
  while (retryCounter < maxRetries) {
    // Get items from the portfolio with the exact fields we want
    // For more information on this API endpoint, see:
    const resp = await fetch(
      `https://app.asana.com/api/1.0/portfolios/${portfolio_gid}/items?opt_fields=name,resource_type,archived,color,created_at,current_status_update.(created_by.name|status_type|created_at|text),notes,modified_at,public,owner.name,start_on,due_on`,
      headers
    );

    // The request succeeds succeeded, return the response from the API (i.e., portfolio items)
    if (resp.ok) {
      const results = await resp.json();
      return results.data;
    }

    // If there is an error (due to lack of permissions, etc.), stop the iteration and display an error
    if (resp.status >= 400 && resp.status != 429 && resp.status != 500) {
      const errorMessage = errorCodeMap[resp.status] || "";
      document.getElementById("errorbox").innerHTML += errorMessage;
      break;
    }

    // Back off exponentially in case we're hitting rate limits (i.e., wait before retrying)
    retryCounter++;
    const wait_time = retryCounter * retryCounter * 120;
    await new Promise((resolve) => setTimeout(resolve, wait_time));
  }

  // Return an empty array by default
  return [];
}

// ================================================
// CSV generation
// ================================================

// exportToCsv() exports project content to a CSV file
function exportToCsv(headers, projects) {
  let csvContent = "";

  // Write the header row
  csvContent += headers.map((h) => `"${h}"`).join(",") + "\n";

  // Map each project as a new row
  let projectsCsvData = projects
    .map((project) => headers.map((key) => project[key] || "").join(","))
    .join("\n");

  // Join the content to the headers
  csvContent += projectsCsvData;

  // Create the file with the data
  const blob = new Blob([csvContent], { type: "text/csv" });
  const href = window.URL.createObjectURL(blob);

  // Force download
  const link = document.createElement("a");
  link.setAttribute("href", href);
  link.setAttribute("download", "portfolio_export.csv");
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(href);
}

// ================================================
// Data formatting
// ================================================

// flattenProjectFields() maps and formats API fields to descriptive reporting headers
function flattenProjectFields(project) {
  const newProject = {
    "Project ID": escapeText(project["gid"] || ""),
    Name: escapeText(project["name"] || ""),
    Notes: escapeText(project["notes"] || ""),
    Color: escapeText(project["color"] || ""),
    "Status color": getStatusColor(project),
    "Status update": escapeText(
      project["current_status_update"]?.["text"] || ""
    ),
    "Status created by": escapeText(
      project["current_status_update"]?.["created_by"]?.["name"] || ""
    ),
    "Status created at": project["current_status_update"]?.["created_at"] || "",
    "Project created at": project["created_at"] || "",
    "Project modified at": project["modified_at"] || "",
    "Owner name": escapeText(project["owner"]?.["name"] || ""),
    Public: project["public"] || "",
    "Start on": project["start_on"] || "",
    "Due on": project["due_on"] || "",
    "Data archived": project["archived"] || "false",
  };

  return newProject;
}

// escapeText() wraps text in double quote (") text delimiters and escapes any double quotes
function escapeText(text) {
  const newText = text.replace(/"/g, '""');
  return `"${newText}"`;
}

// getStatusColor() handles the mapping of status types to colors (i.e., determines the "Status color" field)
function getStatusColor(project) {
  const statusType = project["current_status_update"]?.["status_type"];
  return statusType in statusTextMap ? statusTextMap[statusType] : "";
}

// ================================================
// Error handling
// ================================================

// postError() displays a red error text box on the page
function postError(message) {
  document.getElementById("errorbox").innerText += message;
  // Allow the user to try re-submitting the form (with modified inputs)
  document.getElementById("submit").disabled = false;
  document.getElementById("submit").value = "Generate CSV";

  return;
}

// ================================================
// Maps
// ================================================

// Maps API error codes to useful information
const errorCodeMap = {
  400: "Something went wrong with the request. Check your portfolio GID. For more information on portfolios, see: https://developers.asana.com/reference/portfolios",
  401: "You are not authorized to get this portfolio. Check that you pasted your personal access token correctly and that your portfolio GID is correct",
  403: "You are not authorized to get this portfolio. Check that you pasted your personal access token correctly and that your portfolio GID is correct",
  404: "We couldn't find that portfolio. Check your portfolio GID. For more information on portfolios, see: https://developers.asana.com/reference/portfolios",
};

// Maps project status names to colors
const statusTextMap = {
  on_track: "green",
  at_risk: "yellow",
  off_track: "red",
  on_hold: "blue",
  complete: "complete",
};

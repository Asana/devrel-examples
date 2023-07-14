// ================================================
// Main function (i.e., entry point)
// ================================================

const runExport = async () => {
  // Start a timer (this is purely for performance logging)
  const start = new Date();

  // Reset elements on the page
  const submitBtn = document.getElementById("submit");
  submitBtn.disabled = true;
  submitBtn.value = "Please wait...";
  document.getElementById("errorbox").innerText = "";

  // Parse user input from the page
  const pat = document.getElementById("pat").value;
  const portfolio_gid = document.getElementById("portfolio").value;

  // Validate fields (i.e., to not be empty)
  if (pat === "" || portfolio_gid === "") {
    const message = "Please provide input to both fields to continue";
    // Display a red error text box on the page
    postError(message);
    return;
  }

  // Perform basic validation of the provided portfolio GID
  // For more information on portfolios, see: https://developers.asana.com/reference/portfolios
  if (!portfolio_gid || isNaN(portfolio_gid) || portfolio_gid.length < 3) {
    const message =
      "Your portfolio GID is invalid. Please check it and try again";
    postError(message);
    return;
  }

  // Confirm that the personal access token works
  // For more information on personal access tokens, see: https://developers.asana.com/docs/personal-access-token
  // For more information on this API endpoint, see: https://developers.asana.com/reference/getuser
  const httpHeaders = { Authorization: `Bearer ${pat}` };
  const resp = await fetch(`https://app.asana.com/api/1.0/users/me`, {
    headers: httpHeaders,
  });

  // Display an error if we do not receive a 200 OK response
  if (!resp.ok) {
    const message =
      "Your personal access token is invalid. For documentation, see: https://developers.asana.com/docs/personal-access-token";
    postError(message);
    return;
  }

  // Run the asynchronous portfolioExtract() function
  // This returns an array of objects, each representing a project
  // Note that the resulting array may include duplicate projects (e.g., projects in multiple portfolios)
  const projects = await extractProjectsFromPortfolio(
    portfolio_gid,
    httpHeaders
  );

  // Create a consolidated list of all headers (i.e., titles for each column)
  // To prevent adding duplicated projects, we use a Set because any value in the Set can only occur once
  const headerSet = new Set();

  // Create a consolidated list of all projects
  // finalProjects itself is an object in which project IDs (keys) are mapped to project objects (values)
  const finalProjects = {};

  // Iterate through all projects and check if we've already mapped the project
  // (i.e., if the project ID exists as a key in finalProjects)
  for (const project of projects) {
    const projectId = project["Project ID"];

    if (!(projectId in finalProjects)) {
      finalProjects[projectId] = { ...project };
    }

    for (const property in project) {
      // Add all properties to our set of headers
      // Such properties include Project ID, Project name, etc.
      headerSet.add(property);
    }
  }

  // Get the consolidated list of projects
  // This is an array of objects, each representing a project
  const finalProjectList = Object.values(finalProjects);

  // Create the list of headers
  // This is an array of strings, each representing a header
  const csvHeaders = [...headerSet];

  // Export the data to CSV and download it
  // Arguments include our list of CSV headers and the consolidated list of projects
  exportToCsv(csvHeaders, finalProjectList);

  // Log and display the finish time to the user
  const duration = new Date() - start;
  alert(`Finished in ${duration} ms`);

  // Reset submit button to allow for another submission
  submitBtn.disabled = false;
  submitBtn.value = "Generate CSV";

  return false;
};

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
    // For more information on this API endpoint, see: https://developers.asana.com/reference/getitemsforportfolio
    // For more information on choosing which fields are returned in the response, see: https://developers.asana.com/docs/inputoutput-options
    const resp = await fetch(
      `https://app.asana.com/api/1.0/portfolios/${portfolio_gid}/items?opt_fields=name,resource_type,archived,color,created_at,current_status_update.(created_by.name|status_type|created_at|text),notes,modified_at,public,owner.name,start_on,due_on`,
      headers
    );

    // The request succeeds, return the response from the API (i.e., portfolio items)
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
  link.setAttribute("download", "project_statuses.csv");
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(href);
}

// ================================================
// Data formatting
// ================================================

// flattenProjectFields() maps and formats API fields to descriptive reporting headers
function flattenProjectFields(project) {
  const {
    gid = "",
    name = "",
    current_status_update,
    start_on,
    due_on,
  } = project;

  const newProject = {
    "Project ID": escapeText(gid),
    Name: escapeText(name),
    Link: escapeText(`https://app.asana.com/0/${gid}/list`),
    "Status update": escapeText(current_status_update?.text || ""),
    "Status color": getStatusColor(current_status_update),
    "Status created by": escapeText(
      current_status_update?.created_by?.name || ""
    ),
    "Status created at": current_status_update?.created_at || "",
    "Start on": start_on || "",
    "Due on": due_on || "",
  };

  return newProject;
}

// escapeText() wraps text in double quote (") text delimiters and escapes any double quotes
function escapeText(text) {
  const newText = text.replace(/"/g, '""');
  return `"${newText}"`;
}

// getStatusColor() handles the mapping of status types to colors (i.e., determines the "Status color" field)
function getStatusColor(current_status_update) {
  const { status_type } = current_status_update || {};
  return status_type in statusTextMap ? statusTextMap[status_type] : "";
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


/*
================================================
Main function (i.e., entry point)
================================================
This function is called when the user clicks "Generate CSV".
It:
1. Validates the inputs (PAT and Portfolio GID)
2. Verifies the token with Asana
3. Fetches all projects from the portfolio (and sub-portfolios)
4. Consolidates and deduplicates projects
5. Exports the final data as a CSV file
*/

const runExport = async () => {
  const start = new Date(); // Record start time

  // Update UI to indicate loading
  const submitBtn = document.getElementById("submit");
  submitBtn.disabled = true;
  submitBtn.value = "Please wait...";
  document.getElementById("errorbox").innerText = "";

  // Get values from form fields
  const pat = document.getElementById("pat").value;
  const portfolio_gid = document.getElementById("portfolio").value;

  // Basic validation
  if (pat === "" || portfolio_gid === "") {
    postError("Please provide input to both fields to continue");
    return;
  }

  if (!portfolio_gid || isNaN(portfolio_gid) || portfolio_gid.length < 3) {
    postError("Your portfolio GID is invalid. Please check it and try again");
    return;
  }

  // Try authenticating using the provided PAT
  try {
    let client = Asana.ApiClient.instance;
    let token = client.authentications['token'];
    token.accessToken = pat;

    let usersApiInstance = new Asana.UsersApi();
    let user_gid = "me"; // Gets current user's data
    let opts = { 'opt_fields': "email,name,workspaces" };

    // Docs: https://developers.asana.com/reference/getuser
    await usersApiInstance.getUser(user_gid, opts);
  } catch (error) {
    postError("Your personal access token is invalid. For documentation, see: https://developers.asana.com/docs/personal-access-token");
    return;
  }

  // Build authorization header
  const httpHeaders = {
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  };

  // Recursively fetch all projects in the portfolio tree
  const projects = await extractProjectsFromPortfolio(portfolio_gid, httpHeaders);

  // Deduplicate and aggregate fields across projects
  const headerSet = new Set();
  const finalProjects = {};

  for (const project of projects) {
    const projectId = project["Project ID"];
    if (!(projectId in finalProjects)) {
      finalProjects[projectId] = { ...project };
    }
    for (const property in project) {
      headerSet.add(property);
    }
  }

  // Generate final output and export
  const finalProjectList = Object.values(finalProjects);
  const csvHeaders = [...headerSet];
  exportToCsv(csvHeaders, finalProjectList);

  const duration = new Date() - start;
  alert(`Finished in ${duration} ms`);

  // Re-enable submit button
  submitBtn.disabled = false;
  submitBtn.value = "Generate CSV";

  return false;
};

/*
================================================
Fetch projects and sub-portfolios recursively
================================================
*/

async function extractProjectsFromPortfolio(portfolio_gid, httpHeaders) {
  try {
    let items = await getAsanaPortfolioItems(portfolio_gid, {
      headers: httpHeaders.headers,
    });
    let projects = [];
    let portfolioPromises = [];

    for (let item of items) {
      if (item["resource_type"] === "project") {
        projects.push(flattenProjectFields(item));
      } else if (item["resource_type"] === "portfolio") {
        portfolioPromises.push(
          extractProjectsFromPortfolio(item["gid"], httpHeaders)
        );
      }
    }

    let portfolioResults = await Promise.all(portfolioPromises);
    projects.push(...portfolioResults.flat(3));

    return projects.flat(3);
  } catch (error) {
    console.log(error);
    postError("Something went wrong... inspect the page to view the dev console or wait and try again");
  }
}

/*
================================================
Query Asana API for a portfolio's items
================================================
*/

async function getAsanaPortfolioItems(portfolio_gid, headers) {
  const maxRetries = 10;
  let retryCounter = 0;

  let client = Asana.ApiClient.instance;
  let token = client.authentications['token'];
  token.accessToken = headers.headers.Authorization.replace('Bearer ', '');

  let portfoliosApiInstance = new Asana.PortfoliosApi();
  let opts = {
    'opt_fields': 'name,resource_type,archived,color,created_at,current_status_update.created_by.name,current_status_update.status_type,current_status_update.created_at,current_status_update.text,notes,modified_at,public,owner.name,start_on,due_on'
  };

  while (retryCounter < maxRetries) {
    try {
      // Docs: https://developers.asana.com/reference/getitemsforportfolio
      const results = await portfoliosApiInstance.getItemsForPortfolio(portfolio_gid, opts);
      return results.data;
    } catch (error) {
      if (error.status >= 400 && error.status != 429 && error.status != 500) {
        const errorMessage = errorCodeMap[error.status] || "";
        document.getElementById("errorbox").innerHTML += errorMessage;
        break;
      }

      // Exponential backoff
      retryCounter++;
      const wait_time = retryCounter * retryCounter * 120;
      await new Promise((resolve) => setTimeout(resolve, wait_time));
    }
  }

  return [];
}

/*
================================================
CSV generation
================================================
*/

function exportToCsv(headers, projects) {
  let csvContent = "";
  csvContent += headers.map((h) => `"${h}"`).join(",") + "\n";

  let projectsCsvData = projects
    .map((project) => headers.map((key) => project[key] || "").join(","))
    .join("\n");

  csvContent += projectsCsvData;

  const blob = new Blob([csvContent], { type: "text/csv" });
  const href = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", href);
  link.setAttribute("download", "project_statuses.csv");
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(href);
}

/*
================================================
Flatten raw project data from the API
================================================
*/

function flattenProjectFields(project) {
  const {
    gid = "",
    name = "",
    current_status_update,
    start_on,
    due_on,
  } = project;

  return {
    "Project ID": escapeText(gid),
    Name: escapeText(name),
    Link: escapeText(`https://app.asana.com/0/${gid}/list`),
    "Status update": escapeText(current_status_update?.text || ""),
    "Status color": getStatusColor(current_status_update),
    "Status created by": escapeText(current_status_update?.created_by?.name || ""),
    "Status created at": current_status_update?.created_at || "",
    "Start on": start_on || "",
    "Due on": due_on || "",
  };
}

function escapeText(text) {
  const newText = text.replace(/"/g, '""');
  return `"${newText}"`;
}

function getStatusColor(current_status_update) {
  const { status_type } = current_status_update || {};
  return status_type in statusTextMap ? statusTextMap[status_type] : "";
}

// ================================================
// Error handling
// ================================================

function postError(message) {
  document.getElementById("errorbox").innerText += message;
  document.getElementById("submit").disabled = false;
  document.getElementById("submit").value = "Generate CSV";
}

// ================================================
// Maps
// ================================================

const errorCodeMap = {
  400: "Something went wrong with the request. Check your portfolio GID. For more information on portfolios, see: https://developers.asana.com/reference/portfolios",
  401: "You are not authorized to get this portfolio. Check that you pasted your personal access token correctly and that your portfolio GID is correct",
  403: "You are not authorized to get this portfolio. Check that you pasted your personal access token correctly and that your portfolio GID is correct",
  404: "We couldn't find that portfolio. Check your portfolio GID. For more information on portfolios, see: https://developers.asana.com/reference/portfolios",
};

const statusTextMap = {
  on_track: "green",
  at_risk: "yellow",
  off_track: "red",
  on_hold: "blue",
  complete: "complete",
};

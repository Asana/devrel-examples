/*********************************
Main functionality
**********************************/

const runExport = async () => {
  // Start a timer (this is purely for performance logging)
  let start = new Date();

  // Reset elements on the page
  document.getElementById("submit").disabled = true;
  document.getElementById("errorbox").innerText = "";
  // Add a spinner to indicate a working process to the user
  document.getElementById("lds-spinner").style.display = "block";

  // Parse inputs from document
  let pat = document.getElementById("pat").value;
  let portfolio_gid = document.getElementById("portfolio").value;

  // Validate fields (i.e., to not be empty)
  if (pat == "" || portfolio_gid == "") {
    let message = "Please provide input to both fields to continue";

    postError(message);

    return;
  }

  // Basic validation of the provided portfolio GID
  // For more information on portfolios, see: https://developers.asana.com/reference/portfolios
  if (!portfolio_gid || isNaN(portfolio_gid) || portfolio_gid.length < 3) {
    let message =
      "Your portfolio GID is invalid. Please check it and try again";
    postError(message);
    return;
  }

  // Confirm that the personal access token works
  // For more information on personal access tokens, see: https://developers.asana.com/docs/personal-access-token
  // For more information on this API endpoint, see: https://developers.asana.com/reference/getuser
  const httpHeaders = { Authorization: `Bearer ${pat}` };
  let resp = await fetch(`https://app.asana.com/api/1.0/users/me`, {
    headers: httpHeaders,
  });

  if (!resp.ok) {
    let message =
      "Your personal access token is invalid. For documentation, see: https://developers.asana.com/docs/personal-access-token";

    postError(message);

    return;
  }

  // Run the asynchronous portfolioExtract() function (defined below) to get a single array of all projects
  let projects = await extractPortfolio(portfolio_gid, {}, httpHeaders);

  // Create a consolidated list of all headers, and dedupe any projects which are in multiple portfolios
  let headerSet = new Set();
  let finalProjects = {};

  // Iterate through all projects
  for (let i = 0; i < projects.length; i++) {
    // Check if we've already mapped the project
    if (projects[i]["Project ID"] in finalProjects) {
      // If so, just add any additional properties...
      finalProjects[projects[i]["Project ID"]] = {
        ...projects[i],
        ...finalProjects[projects[i]["Project ID"]],
      };
    } else {
      // ...otherwise, create a new project
      finalProjects[projects[i]["Project ID"]] = {
        ...projects[i],
      };
    }

    for (const property in projects[i]) {
      // Add all properties (custom fields) to our set of headers
      headerSet.add(property);
    }
  }

  // Get the consolidated list of projects
  let finalProjectList = Object.values(finalProjects);

  // Create the list of headers
  let csvHeaders = [...headerSet];

  // Export the data to CSV and download it:
  exportToCsv(csvHeaders, finalProjectList, "PortfolioExport");

  // Log the finish time
  let time = new Date() - start;
  alert(`Finished in ${time} ms`);

  // Stop running the spinner and allow for another submit
  document.getElementById("lds-spinner").style.visibility = "hidden";
  document.getElementById("submit").disabled = false;
  return false;
};

/*********************************
Utils
**********************************/

// Display a red error text box on the page, allowing the user to try re-submitting the form (with modified inputs)
function postError(message) {
  document.getElementById("errorbox").innerText += message;

  document.getElementById("lds-spinner").style.visibility = "hidden";

  document.getElementById("submit").disabled = false;

  return;
}

// A recursive function that takes in a portfolio GID, any portfolio-level custom fields that should apply to all projects, and default headers (including authorization)
// The function returns a list of all projects under that portfolio, including projects in nested portfolios
async function extractPortfolio(portfolio_gid, presetValues, httpHeaders) {
  let items = [];
  // Get all items from the portfolio
  try {
    items = await getAsanaPortfolioItems(portfolio_gid, {
      headers: httpHeaders,
    });
  } catch (error) {
    console.log(error);
    postError(
      "Something went wrong... inpect the page to view the dev console or wait and try again"
    );
  }

  let projects = [];
  let portfolioPromises = [];

  // Iterate through items
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    // Get the item's custom fields into a flat dictionary
    let itemFields = flattenCustomFields(item);

    if (item["resource_type"] == "project") {
      // If the item is a project, flatten the standard project fields, add its custom fields, and then add it to our list of projects
      let newItem = {
        ...flattenProjectFields(item),
        ...itemFields,
        ...presetValues,
      };
      projects.push(newItem);
    } else if (item["resource_type"] == "portfolio") {
      // If the item is a portfolio, run this function recursively
      portfolioPromises.push(
        extractPortfolio(
          item["gid"],
          { ...itemFields, ...presetValues },
          httpHeaders
        )
      );
    }
  }

  // Wait for all the nested portfolio responses to come back...
  let portfolioResults = await Promise.all(portfolioPromises);
  // ...then add those projects to the list
  projects.push(portfolioResults);

  // Since the above can create nested arrays, we flatten them out
  let flatProjects = projects.flat(3);

  return flatProjects;
}

// Uses the Asana API to get all the projects and portfolios from a portfolio.
async function getAsanaPortfolioItems(portfolio_gid, headers) {
  // Max retries for rate limited calls
  // For more information on rate limits, see: https://developers.asana.com/docs/rate-limits
  let complete = false;
  let retryCounter = 0;
  let maxRetries = 10;

  // While we haven't finished the request, keep trying
  while (retryCounter < maxRetries) {
    // Get items from the portfolio with the exact fields we want
    // For more information on this API endpoint, see: https://developers.asana.com/reference/getitemsforportfolio
    const resp = await fetch(
      `https://app.asana.com/api/1.0/portfolios/${portfolio_gid}/items?opt_fields=name,resource_type,archived,color,created_at,current_status_update.(created_by.name|status_type|created_at|text),notes,modified_at,public,owner.name,start_on,due_on,custom_fields.(name|display_value|type|number_value|datetime_value)`,
      headers
    );
    // If we succeeded, return the results...
    if (resp.ok) {
      const results = await resp.json();
      return results["data"];
    }

    // If there is an error (due to lack of permissions, etc.), stop the iteration
    if (resp.status >= 400 && resp.status != 429 && resp.status != 500) {
      document.getElementById("errorbox").innerHTML +=
        errorCodeMap[resp.status] || "";
      break;
    }

    // Back off exponentially in case we're hitting rate limits (i.e., wait before retrying)
    retryCounter++;
    let wait_time = retryCounter * retryCounter * 120;

    await new Promise((r) => setTimeout(r, wait_time));
  }

  return [];
}

// Map and format API fields to descriptive reporting headers
function flattenProjectFields(project) {
  newProject = {
    "Project ID": escapeText(project["gid"] || ""),
    "Project Name": escapeText(project["name"] || ""),
    "Project Notes": escapeText(project["notes"] || ""),
    "Project Color": escapeText(project["color"] || ""),
    "Project Created At": project["created_at"] || "",
    "Project Data Archived": project["archived"] || "false",
    "Project Current Status Color":
      project["current_status_update"]?.["status_type"] in statusTextMap
        ? statusTextMap[project["current_status_update"]?.["status_type"]]
        : "",
    "Project Current Status Posted By": escapeText(
      project["current_status_update"]?.["created_by"]?.["name"] || ""
    ),
    "Project Current Status Posted On":
      project["current_status_update"]?.["created_at"] || "",
    "Project Current Status Text": escapeText(
      project["current_status_update"]?.["text"] || ""
    ),
    "Project Modified At": project["modified_at"] || "",
    "Project Name": escapeText(project["name"] || ""),
    "Project Owner Name": escapeText(project["owner"]?.["name"] || ""),
    "Project Public": project["public"] || "",
    "Project Start On": project["start_on"] || "",
    "Project Due On": project["due_on"] || "",
  };

  return newProject;
}

// Wrap text in double quote (") text delimiters and escape any double quotes
function escapeText(text) {
  let newText = text.replace(/"/g, '""');
  return '"' + newText + '"';
}

// Flatten the API-provided custom fields to a simple key-value store
function flattenCustomFields(object) {
  let flattenedFields = {};

  if ("custom_fields" in object) {
    for (let i = 0; i < object["custom_fields"].length; i++) {
      let field = object["custom_fields"][i];

      if (!!field["display_value"]) {
        if (["multi_enum", "enum", "text", "people"].includes(field["type"])) {
          flattenedFields[field["name"]] = escapeText(
            field["display_value"] || ""
          );
        } else if (field.type == "date") {
          flattenedFields[field["name"]] = field["display_value"];
        } else if (field.type == "number") {
          flattenedFields[field["name"]] = field["number_value"];
        }
      } else {
        flattenedFields[field["name"]] = "";
      }
    }
  }
  return flattenedFields;
}

// Export project content to a CSV file
function exportToCsv(headers, projects, fileName) {
  let csvContent = "";

  // Write the header row
  csvContent += headers.map((h) => '"' + h + '"').join(",");
  csvContent += "\n";

  // Map each project as a new row
  let projectsCsvData = projects
    .map((project) => {
      let rowString = "";
      rowString += headers.map((key) => project[key] || "").join(",");

      return rowString;
    })
    .join("\n");

  // Join the content to the headers
  csvContent += projectsCsvData;

  // Create the file with the data;
  let blob = new Blob([csvContent], { type: "text/csv" });
  let href = window.URL.createObjectURL(blob);

  // Force download:
  let link = document.createElement("a");
  link.setAttribute("href", href);
  link.setAttribute("download", "portfolio_export.csv");
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(href);

  return;
}

// Map API error codes to useful information
const errorCodeMap = {
  400: "Something went wrong with the request. Check your portfolio GID. For more information on portfolios, see: https://developers.asana.com/reference/portfolios",
  401: "You are not authorized to get this portfolio. Check that you pasted your personal access token correctly and that your portfolio GID is correct",
  403: "You are not authorized to get this portfolio. Check that you pasted your personal access token correctly and that your portfolio GID is correct",
  404: "We couldn't find that portfolio. Check your portfolio GID. For more information on portfolios, see: https://developers.asana.com/reference/portfolios",
};

// Map project status names to colors
const statusTextMap = {
  on_track: "green",
  at_risk: "yellow",
  off_track: "red",
  on_hold: "blue",
  complete: "complete",
};

// postError() displays a red error text box on the page
function postError(message) {
  document.getElementById("errorbox").innerText += message;
  // Allow the user to try re-submitting the form (with modified inputs)
  document.getElementById("submit").disabled = false;
  document.getElementById("submit").value = "Generate CSV";

  return;
}

// extractProjectsFromPortfolio() returns a list of all projects under that portfolio (including projects in nested portfolios)
// This is a recursive function that takes in:
// - A portfolio GID
// - Any portfolio-level custom fields that should apply to all projects
// - Default HTTP headers (including authorization)
async function extractProjectsFromPortfolio(
  portfolio_gid,
  presetValues,
  httpHeaders
) {
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
    // Get the item's custom fields into a flat object
    let itemFields = flattenCustomFields(item);

    if (item["resource_type"] == "project") {
      // If the item is a project, flatten/map the standard project fields, add its custom fields, and then add it to our list of projects
      let newItem = {
        ...flattenProjectFields(item),
        ...itemFields,
        ...presetValues,
      };
      projects.push(newItem);
    } else if (item["resource_type"] == "portfolio") {
      // If the item is a portfolio, run this function recursively
      portfolioPromises.push(
        extractProjectsFromPortfolio(
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

  // flatProjects is an array of objects, each representing a project
  return flatProjects;
}

// getAsanaPortfolioItems() makes a request against the Asana API to get all the projects and portfolios from a portfolio
// Documentation: https://developers.asana.com/reference/getitemsforportfolio
async function getAsanaPortfolioItems(portfolio_gid, headers) {
  // Max retries for rate limited calls
  // For more information on rate limits, see: https://developers.asana.com/docs/rate-limits
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

    // The request succeeds succeeded, return the response from the API (i.e., portfolio items)
    if (resp.ok) {
      // results is an array of objects (where each object is either a project or portfolio)
      const results = await resp.json();
      return results["data"];
    }

    // If there is an error (due to lack of permissions, etc.), stop the iteration and display an error
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

  // Return an empty array by default
  return [];
}

// exportToCsv() exports project content to a CSV file
function exportToCsv(headers, projects) {
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

  // Force download
  let link = document.createElement("a");
  link.setAttribute("href", href);
  link.setAttribute("download", "portfolio_export.csv");
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(href);

  return;
}

/* ####################### Data formatting ####################### */

// flattenProjectFields() maps and formats API fields to descriptive reporting headers
function flattenProjectFields(project) {
  newProject = {
    "Project ID": escapeText(project["gid"] || ""),
    "Name": escapeText(project["name"] || ""),
    "Notes": escapeText(project["notes"] || ""),
    "Color": escapeText(project["color"] || ""),
    "Created at": project["created_at"] || "",
    "Data archived": project["archived"] || "false",
    "Current status color":
      project["current_status_update"]?.["status_type"] in statusTextMap
        ? statusTextMap[project["current_status_update"]?.["status_type"]]
        : "",
    "Current status created by": escapeText(
      project["current_status_update"]?.["created_by"]?.["name"] || ""
    ),
    "Current status created at":
      project["current_status_update"]?.["created_at"] || "",
    "Current status text": escapeText(
      project["current_status_update"]?.["text"] || ""
    ),
    "Modified at": project["modified_at"] || "",
    "Owner name": escapeText(project["owner"]?.["name"] || ""),
    "Public": project["public"] || "",
    "Start on": project["start_on"] || "",
    "Due on": project["due_on"] || "",
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

      // If display_value has a non-empty (i.e., truthy) string value
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

/* ####################### Maps ####################### */

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

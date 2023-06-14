const runExport = async () => {
  // Start a timer (this is purely for performance logging)
  let start = new Date();

  // Reset elements on the page
  document.getElementById("submit").disabled = true;
  document.getElementById("submit").value = "Please wait...";
  document.getElementById("errorbox").innerText = "";

  // Parse user input from the page
  let pat = document.getElementById("pat").value;
  let portfolio_gid = document.getElementById("portfolio").value;

  // Validate fields (i.e., to not be empty)
  if (pat == "" || portfolio_gid == "") {
    let message = "Please provide input to both fields to continue";
    // Display a red error text box on the page (see utils.js)
    postError(message);
    return;
  }

  // Perform basic validation of the provided portfolio GID
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

  // Display an error if we do not receive a 200 OK response
  if (!resp.ok) {
    let message =
      "Your personal access token is invalid. For documentation, see: https://developers.asana.com/docs/personal-access-token";
    postError(message);
    return;
  }

  // Run the asynchronous portfolioExtract() function (see utils.js)
  // This returns an array of objects, each representing a project
  // Note that the resulting array may include duplicate projects (e.g., projects in multiple portfolios)
  let projects = await extractProjectsFromPortfolio(
    portfolio_gid,
    {},
    httpHeaders
  );

  // Create a consolidated list of all headers
  // To prevent adding duplicated projects, we use a Set because since any value in the Set can only occur once
  let headerSet = new Set();

  // Create a consolidated list of all projects
  // finalProjects itself is an object in which project IDs (keys) are mapped to project objects (values)
  let finalProjects = {};

  // Iterate through all projects
  for (let i = 0; i < projects.length; i++) {
    // Check if we've already mapped the project
    // (i.e., if the project ID exists as a key in finalProjects)
    if (projects[i]["Project ID"] in finalProjects) {
      // If so, just add any additional properties...
      finalProjects[projects[i]["Project ID"]] = {
        ...projects[i],
        ...finalProjects[projects[i]["Project ID"]],
      };
    } else {
      // ...otherwise, add the new project into finalProjects
      finalProjects[projects[i]["Project ID"]] = {
        ...projects[i],
      };
    }

    for (const property in projects[i]) {
      // Add all properties (including custom fields) to our set of headers
      // Such properties include Project ID, Project name, etc.
      headerSet.add(property);
    }
  }

  // Get the consolidated list of projects
  // This is an array of objects, each representing a project
  let finalProjectList = Object.values(finalProjects);

  // Create the list of headers (i.e., titles for each column)
  // This is an array of strings, each representing a header
  let csvHeaders = [...headerSet];

  // Export the data to CSV and download it (see utils.js)
  // Arguments include our list of CSV headers, the consolidated list of projects, and "PortfolioExport" as the file name
  exportToCsv(csvHeaders, finalProjectList);

  // Log and display the finish time to the user
  let duration = new Date() - start;
  alert(`Finished in ${duration} ms`);

  // Reset submit button to allow for another submission
  document.getElementById("submit").disabled = false;
  document.getElementById("submit").value = "Generate CSV";

  return false;
};

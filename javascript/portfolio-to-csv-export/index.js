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
    // Display a red error text box on the page (see utils.js)
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

  // Run the asynchronous portfolioExtract() function (see utils.js)
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

  // Iterate through all projects
  for (const project of projects) {
    const projectId = project["Project ID"];
    // Check if we've already mapped the project
    // (i.e., if the project ID exists as a key in finalProjects)
    if (projectId in finalProjects) {
      // If so, just add any additional properties...
      finalProjects[projectId] = {
        ...project,
        ...finalProjects[projectId],
      };
    } else {
      // ...otherwise, add the new project into finalProjects
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

  // Export the data to CSV and download it (see utils.js)
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

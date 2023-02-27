# Portfolio to CSV Export
 
The Portfolio to CSV Export script is used to extract [project](https://developers.asana.com/reference/projects) metadata from a nested [portfolio](https://developers.asana.com/reference/portfolios) structure in Asana. The resulting data is exported in CSV format.

## Requirements

Since the script largely makes use of out-of-the-box [DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) methods in the browser, there are no system requirements for this script.

Otherwise, ensure that you have the latest version of your preferred browser installed on your local machine.

## Usage

The entry point for the script is `./portfolio-export.html`, a page that embeds the client-side script: `./index.js`.

Before you begin, be sure to obtain a [personal access token](https://developers.asana.com/docs/personal-access-token) (PAT). This personal access token is how the script authenticates with Asana to request data via the Asana API. Upon successful authentication, the script parses and formats that data into a single CSV file.

Then, to get started, open `./portfolio-export.html` in your browser and provide your personal access token and a portfolio GID in the input fields. Additional operating instructions are included on the page itself.

## Output

The standard information outputted in the resulting CSV file include the following project metadata:

* `gid`
* `name`
* `notes`
* `color`
* `created_at`
* `archived`
* `current_status_update`
* `modified_at`
* `owner`
* `public`
* `start_on`
* `due_on`

In addition, the CSV file will also include details on any [custom fields](https://developers.asana.com/docs/custom-fields-guide) associated with those projects.

To get more information on a project, you can request the project record by using its GID with the Asana API, as documented here: [GET /projects/{project_gid}](https://developers.asana.com/reference/getproject)
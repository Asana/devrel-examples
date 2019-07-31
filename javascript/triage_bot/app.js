const asana = require("asana");
const config = require("./config");

// Get personal access token (PAT) from environment variables.
const accessToken = process.env.triage_bot_pat;

// At the time of writing this guide, the Asana API is going through 
// two deprecations (moving to string ids and changing how sections function).
// You can learn about our deprecations framework in our docs
// (https://asana.com/developers/documentation/getting-started/deprecations).
// To prevent my app from breaking when the deprecations are finalized, I'm 
// passing headers to enable the new API behavior for string gids and sections.
const deprecationHeaders = {"defaultHeaders": {"asana-enable": "new_sections,string_ids"}};

// Create Asana client using PAT and deprecation headers.
const client = asana.Client.create(deprecationHeaders).useAccessToken(accessToken);


// Request the unassigned tasks (up to 100) from the specified project
// and pass the array of unassinged tasks to randomAissinger().
function getUnassingedTasks() {
  let workspaceId = config.workspaceId;
  let params = {
    "projects.any" : config.designRequestProjectId,
    "assignee.any" : "null",
    "resource_subtype": "default_task",
    "fields": "gid",
    "limit": 100
  };
  client.tasks.searchInWorkspace(workspaceId, params).then(tasks => {
    randomAssigner(tasks.data);
  });
}

// Helper function to randomly shuffle an array.
// Used to randomize the Asana users fulfilling requests.
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  return array;
}

// Helper function to assigns a task in Asana
function assignTask(taskStringId, assigneeStringId) {
  client.tasks.update(taskStringId, {assignee: assigneeStringId})
}

// Takes array of unassiged task gids and round-robin assigns them to 
// a shuffled group of the Asana users specified in the config file.
function randomAssigner(unassingedTasks) {
  console.log("You've assigned " + toString(unassingedTasks.length) + 
    " new design requests")
  let shuffledDesigners = shuffleArray(config.designers);
  let numDesigners = shuffledDesigners.length;
  for (let i = 0; i < unassingedTasks.length; i++) {
    assignTask(unassingedTasks[i].gid, shuffledDesigners[i % numDesigners]);
  }  
}


// Run the triage bot:
getUnassingedTasks();


// TODO:
// Ping overdue tasks
  // Use searchInWorkplace to find tasks that are overdue in the requests project
  // Ping the over due tasks with a snarky message.





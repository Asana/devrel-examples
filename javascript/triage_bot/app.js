const asana = require("asana");
const config = require("./config");

// Get personal access token (PAT) from environment variables.
const accessToken = process.env.triage_bot_pat;

// At the time of writing this guide, the Asana API is going through
// two deprecations (moving to string ids and changing how sections function).
// You can learn about our deprecations framework in our docs
// (https://asana.com/developers/documentation/getting-started/deprecations).
// To prevent this bot from breaking when the deprecations are finalized, I'm
// passing headers to enable the new API behavior for string gids and sections.
const deprecationHeaders = {"defaultHeaders": {"asana-enable": "new_sections,string_ids"}};

// Create Asana client using PAT and deprecation headers.
const client = asana.Client.create(deprecationHeaders).useAccessToken(accessToken);

// Request delay in ms. We will use this to avoid hitting Asana rate limits:
// https://asana.com/developers/documentation/getting-started/rate-limits
const delay = 200;


// Request the unassigned tasks (up to 100) from the specified project
// and pass the array of unassigned tasks to randomAssigner().
function getUnassignedTasks() {
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

// Helper function to randomly shuffle an array. We will use it to 
// randomize the list of Asana users fulfilling requests.
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

// Helper function to assign a task in Asana.
function assignTask(taskStringId, assigneeStringId) {
  client.tasks.update(taskStringId, {assignee: assigneeStringId});
}

// Takes an array of unassigned tasks and an array of designers 
// and assigns a designer to each task. 
function randomAssigner(unassignedTasks) {
  let shuffledDesigners = shuffleArray(config.designers);
  let numDesigners = shuffledDesigners.length;
  // We will use an interval to control how quickly requests are sent 
  // in order to avoid being rate limited. The interval uses the 
  // const delay, which determines how long to wait between requests.
  let index = 0;
  let interval = setInterval(function() {
    assignTask(unassignedTasks[index].gid, shuffledDesigners[index % numDesigners]);
    index++;
    if (index >= unassignedTasks.length) {
      clearInterval(interval);
      console.log("You've assigned " + unassignedTasks.length + " new design requests");
    }
  }, delay);
}

// Run the triage bot.
getUnassignedTasks();


// Potential enhancements to add to the bot:
//   -Find tasks that are nearly due and remind the assignee.
//   -Ping over due tasks with a snarky message.
//   -Use web hooks to keep the triage bot synced in real time. 





// This script uses Asana node 3.0.1
// npm install asana@3.0.1
// Seee the SDK repo for mroe infomation:  https://github.com/Asana/node-asana
const Asana = require('asana');

let client = Asana.ApiClient.instance;
let token = client.authentications['token'];
let tasksApiInstance = new Asana.TasksApi(); // instance to access tasks
// Add your access token
// Remember to keep your secrets secret
// For eaxample, store your personal access token (PAT) as an environment variable
token.accessToken = process.env.triage_bot_pat;

// Add your gids to configure your triage bot 
let config = {
  workspaceId: "123456",
  projectId: "123456",
  userRotation: ["123456", "w.coyote@acme.com"] //consider using email addresses instead of user gids to be more human readable
}

// Function to fetch unassigned and incomplete tasks with 100 task limit
// This funciton uses the search endpoint which doesn't support pagiation 
// If you expect more than 100 results, use getTasks and pagination
// You will need to do client-side filtering to go through each task 
// to check if assignee is null and completed is false 
async function fetchUnassignedIncompleteTasks(workspaceId, projectId) {
  try {
    let unassignedIncompleteTasks = await tasksApiInstance.searchTasksForWorkspace(workspaceId, {
      'completed': 'false',
      'assignee.any': 'null',
      'projects.any': projectId,
      'limit': 100,
    });

    let tasks = unassignedIncompleteTasks.data;

    for(let task of tasks) {
      assignTask(task)		
    }

  } catch (error) {
    console.error('Error: ', error);
  }
}

// Helper function to choose a random assignee from an array
// Instead of randomly selecting an assignee, 
// you could add a feature to check each users' capacity 
// or count how many tasks they already have assigned in the project
function selectRandomAssignee(){
  return config.userRotation[Math.floor(Math.random() * config.userRotation.length)];
}

// Function to assign tasks to a random assignee
async function assignTask(task){
  // Select a random assignee
  let randomAssignee = selectRandomAssignee();
  
  try {
    // Update the task with the chosen assignee
    let body = {"data": {"assignee": randomAssignee}};
    let updatedTask = await tasksApiInstance.updateTask(body, task.gid);
    console.log(`Task "${updatedTask.data.name}" is now assigned to ${updatedTask.data.assignee.name}`);

  } catch (error) {
    console.error(`Error in assigning task "${task.name}": ${error}`);
  }
}

// Run the triage bot
fetchUnassignedIncompleteTasks(config.workspaceId, config.projectId);


// ** Possible featues to add **

// If the project has more than 100 tasks: 
// use getTasks and add pagination to fetch more than 100 unassinged tasks from a project 


// For selecting the assignee:
// Instead of random selection, check capacity and assign tasks accordingly 


// To configure this script in the Asana web app:
// Create an Asana task to use as the config file 
// Add a getTask(taskGid, opts) function to get the config data from the notes field of the task 
// This will allow Asana users to update the configuraiton of the triage bot without touching this code. 

const asana = require("asana");

// Constants and Asana client setup
const workspaceGid = "<WORKSPACE_GID>";
const projectGid = "<PROJECT_GID>";
const assignees = ["<USER_1>", "<USER_2>", "<USER_3>"];

const client = asana.Client.create().useAccessToken("<PERSONAL_ACCESS_TOKEN>");
const delay = 200;

// Fetch unassigned tasks and assign them randomly to assignees
function getUnassignedTasks() {
  const params = {
    "projects.any": projectGid,
    "assignee.any": "null",
    "resource_subtype": "default_task",
    "fields": "gid",
    "limit": 100
  };
  client.tasks.searchTasksForWorkspace(workspaceGid, params).then(tasks => {
    if (tasks.data.length === 0) {
      console.log("No unassigned tasks found");
      return;
    } else {
      randomAssigner(tasks.data);
    }
  });
}

// Shuffle array elements
function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

// Assign a task to a assignee
function assignTask(taskId, assigneeId) {
  client.tasks.update(taskId, { assignee: assigneeId });
}

// Randomly assign unassigned tasks to assignees
function randomAssigner(unassignedTasks) {
  const shuffledAssignees = shuffleArray(assignees);
  const numAssignees = shuffledAssignees.length;
  let index = 0;

  const interval = setInterval(() => {
    assignTask(unassignedTasks[index].gid, shuffledAssignees[index % numAssignees]);
    index++;
    if (index >= unassignedTasks.length) {
      clearInterval(interval);
      console.log(`Assigned ${unassignedTasks.length} new assignee requests`);
    }
  }, delay);
}

getUnassignedTasks();

const getTaskRefs = async (client, projectId) => {
  console.log('Retrieving all task references for project', projectId);
  return await client.projects.tasks(projectId);
};

const getTask = async (client, taskId) => {
  console.log('Retrieving full task for task ID', taskId);
  return await client.tasks.findById(taskId);
};

// TODO: Can we use the "Search tasks in a workspace" endpoint
// to provide server-side filtering?
// It seems like we should be able to call something like:
// https://app.asana.com/api/1.0/workspaces/15793206719/tasks/search?projects.any=1148349108183377&text=bar,
// but it's not clear how to do this in the node-asana client library.
// For now, we will rely on the client-side filtering
// implemented in the task_client_filter module,
// but if we did support server-side filtering, we would add it to the task provider here.

module.exports = {
  getTaskRefs,
  getTask,
};

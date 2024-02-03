const getTaskRefs = async (tasksApiInstance, projectId) => {
  console.log('Retrieving all task references for project', projectId);
  let opts = {
    opt_fields: 'name,assignee,completed,resource_type,resource_subtype'
  };
  // getTasksForProject() only works for pojects with less than 1000 tasks.
  // Use pagination if your project has more than 1000 tasks. To do so,
  // use nextPage() and set a limit in the request.
  // See the "Pagination" section of the SDK docs for more details:  https://github.com/Asana/node-asana
  return await tasksApiInstance.getTasksForProject(projectId, opts);
};

const getTask = async (tasksApiInstance, taskId) => {
  console.log('Retrieving full task for task ID', taskId);
  return await tasksApiInstance.getTask(taskId);
};

module.exports = {
  getTaskRefs,
  getTask,
};


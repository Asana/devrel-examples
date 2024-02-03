const getTaskRefs = async (tasksApiInstance, projectId) => {
  console.log('Retrieving all task references for project', projectId);
  let opts = {
    opt_fields: 'name,assignee,completed,resource_type,resource_subtype'
  };
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

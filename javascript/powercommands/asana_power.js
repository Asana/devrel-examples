#!/usr/bin/env node

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('list', 'List all of the matching tasks')
  .command('complete', 'Complete all of the matching tasks')
  .command('incomplete', 'Incomplete all of the matching tasks')
  .command('comment', 'Add a comment with a message on all of the matching tasks')
  .alias('t', 'token')
  .nargs('t', 1)
  .describe('t', 'The access token used to authenticate to Asana')
  .alias('p', 'project')
  .describe('p', 'The project that we should operate on. Can be provided either as an ID or a link')
  .alias('s', 'save')
  .describe(
    's',
    'Indicates that we should save the provided token and project parameters to the keychain for future requests'
  )
  .alias('m', 'message')
  .describe('m', "The message used in commands such as 'comment'")
  .alias('a', 'all')
  .describe(
    'a',
    'Indicates that we should operate over all tasks in the target project. Not compatible with other filters'
  )
  .alias('n', 'name')
  .describe(
    'name',
    'Indicates that we should operate only on the tasks whose name contains this value. Compatible with other filters'
  )
  .alias('o', 'notes')
  .describe(
    'notes',
    'Indicates that we should operate only on the tasks whose notes (the task text) contains this value. Compatible with other filters'
  )
  .alias('@', 'assignee')
  .describe(
    'assignee',
    'Indicates that we should operate only on the tasks whose assignee\'s name contains this value. Compatible with other filters'
  )
  .alias('c', 'completed')
  .describe(
    'completed',
    'Indicates that we should operate only on the tasks which are completed. Compatible with other filters'
  )
  .alias('i', 'incomplete')
  .describe(
    'incomplete',
    'Indicates that we should operate only on the tasks which are incomplete. Compatible with other filters'
  )
  .alias('h', 'help')
  .help('h')
  .alias('v', 'version').argv;
const asana = require('asana');
const connectionSettings = require('./connection_settings.js');
const taskProvider = require('./task_provider.js');
const taskFilterer = require('./task_client_filter.js');
const commandRunner = require('./command_runner.js');

const run = async () => {
  try {
    const projectId = await connectionSettings.getProjectId(argv.project, argv.save);
    const token = await connectionSettings.getToken(argv.token, argv.save);
    const command = commandRunner.getCommand(argv);
    if (!command) return;
    const filters = taskFilterer.getFilters(argv);
    const client = await asana.Client.create().useAccessToken(token);
    const tasks = await taskProvider.getTaskRefs(client, projectId);
    tasks.stream().on('data', async taskRef => {
      const task = await taskProvider.getTask(client, taskRef.gid);
      if (filters.some(filter => !filter.matchesTask(task))) return;
      await commandRunner.runCommand(client, command, task, argv);
    });
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

run();

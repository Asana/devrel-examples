# Triage Bot

Example Asana Node script to fetch 100 un-assigned tasks from a project and then assign them to a user randomly selected from a defined group of users.

## Why build a bot?
When processes get complex in Asana, there can begin to be "work about work." This could be happening to you if you find yourself spending time doing repetitive work such as triaging tasks, reminding people to do something, or adding/removing followers as you move a task through a workflow.

The Triage Bot is an example automation script to solve a common workflow where a group of people need to action incoming tasks. For example, a technical support inbox or a design request inbox. 

## Instructions
1: [Generate an Asana personal access token (PAT)](https://developers.asana.com/docs/personal-access-token#generating-a-pat)

2: Replace the placeholder values (e.g., `<WORKSPACE_GID>`, `<PROJECT_GID>`, `<USER_1>`, `<USER_2>`, `<USER_3>`, `<PERSONAL_ACCESS_TOKEN>`) in `app.js` with your values
```javascript
// Constants and Asana client setup
const workspaceGid = "<WORKSPACE_GID>";
const projectGid = "<PROJECT_GID>";
const assignees = ["<USER_1>", "<USER_2>", "<USER_3>"];

const client = asana.Client.create().useAccessToken("<PERSONAL_ACCESS_TOKEN>");
```
3: Run `npm install`

4: Run `node app.js`

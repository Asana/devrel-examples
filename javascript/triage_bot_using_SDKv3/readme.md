# Triage Bot
Example Asana Node script to fetch all unassigned and incomplete tasks from a project and then assign them to a user randomly selected from a defined group of users.


## Why build a bot?
When processes get complex in Asana, there can begin to be "work about work." This could be happening to you if you find yourself spending time doing repetitive work such as triaging tasks, reminding people to do something, or adding/removing followers as you move a task through a workflow.

The Triage Bot is an example automation script to solve a common workflow where a group of people need to work on incoming tasks. For example, a technical support inbox or a design request inbox. 

## What is the Triage Bot?
This is an example Asana Node script to fetch all unassigned and incomplete tasks from a project and then assign them to a user randomly selected from a defined group of users.


## Why build a bot?
When processes get complex in Asana, there can begin to be "work about work." This could be happening to you if you find yourself spending time doing repetitive work such as triaging tasks, reminding people to do something, or adding/removing followers as you move a task through a workflow.

The Triage Bot is an example automation script to solve a common workflow where a group of people need to action incoming tasks. For example, a technical support inbox or a design request inbox. 

## Instructions to run the Triage
1. **Run `npm install`**  
2. **Authenticate the script in app.js**
	Add a personal access token (PAT) to line 12 of app.js. To get a PAT, log in to the Asana account that will be used for the bot and navigate to the developer console. Create a new token and follow the instructions. Treat this token like a username and password. Do not share it with anyone and never publish it to a public repository. You may also wish to save the token as an environment variable.

	Note that the bot will be taking actions in Asana authored by the person who generated the PAT. You will likley want to use a specfic bot account with a name and photo that makes it clear that this is a bot and not a real person assigning the tasks.  
 
 3. **Update the config settings in app.js**
	On line 15 of app.js, update the config object with your configuration preferences for the script (i.e. the project you want it to operate on and the group of Asana users you want to randomly assign incomplete and unassigned tasks between. 
 5. **Run the script in the command line**
	`node app.js`
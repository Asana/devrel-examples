# powercommands
Command-line interface for power-user operations over the Asana API

To install and run:
- Install node
- Clone the repository
- Inside this folder, run `npm link`
- Run `asana-power -h` to see all help options, then go from there!

## Examples

Configure your connection settings and save them to your keychain:
- `asana-power --token <your_personal_access_token> --project <your_project_url> --save`

The project can be provided as either a URL or an ID:
- `asana-power --project https://app.asana.com/0/1148349108183377/list --save`
- `asana-power --project 1148349108183377 --save`

List all of the tasks in the target project:
- `asana-power list --all`

List all of the tasks which contain some text in its notes:
- `asana-power list --notes "some text"`

Complete all of the tasks which match some assignee:
- `asana-power complete --assignee "Kenan Kigunda"`

You can mix and match filters. For example, we can go back and incomplete the subset of tasks which match some assignee and have some text:
- `asana-power incomplete --assignee "Kenan Kigunda" --notes "some text"`

Add a comment on a task with a particular name:
- `asana-power comment --name "The lights are out" --message "We tried to replace the bulb today but the new one didn't fit :("`

At any point, you can run a command on a project or with a token different than the one saved in the keychain by passing the corresponding parameters:
- `asana-power list --all --project <your_other_project_url>`
- `asana-power comment --name "The lights are out" --message "We'll order another one next week" --token <token_for_the_vendor>`

Each of the options has an alias. For example, you can call:
- `asana-power list -a` (all)
- `asana-power list -c` (completed)
- `asana-power list -i` (incompleted)
- `asana-power complete -@ Kenan -n lights` (assignee, name)
- `asana-power comment -o workshop -m "Is the workshop still happening?"` (notes, message)

## Code references

To see how we read tasks, see `task_provider.js`

To see how we filter tasks, see `task_client_filter.js`

To see how we run commands on each task, see `command_runner.js`

The main file, `asana_power.js`, orchestrates these modules together
# Summary Task
This is an example of retrieving tasks from a project and creating a task.

```
usage: summary_task.py [-h] summary_project_id project_id [project_id ...]

positional arguments:
  summary_project_id  project id of project to post summary task to
  project_id          project id of project to summarize

optional arguments:
  -h, --help          show this help message and exit
```

For each `project_id`, the script will create a "summary" task in the 
`summary_project_id` containing aggregate data about the summary. 
This data includes:
  * Project
    * Last modified time
  * All tasks
    * Number of tasks
    * Number of tasks completed
  * Incomplete tasks
    * Number of incomplete tasks
    * Number of incomplete tasks unassigned
    * Number of incomplete tasks overdue
  * Custom Fields
    * Enum field
      * Number of tasks in each enum option
      * Number of tasks with no selected option
    * Number field
      * Number of tasks with field filled in
      * Total sum of numbers
      * Average of numbers
    * Text field
      * Number of tasks with text field filled in
      * Number of tasks with text field not filled in
require 'asana'

# It's a best practice to set your Personal Access Token (PAT) as an environment variable.
# Alternatively, the script will work if you paste your PAT directly in this file, HOWEVER,
# treat it as a password and never publish it to the web (e.g. on github). Anyone with your
# PAT can act as you in Asana.
PERSONAL_ACCESS_TOKEN = ENV['ASANA_PAT']

# Configuration:
# Add the project-ids of the projects you want this script to act upon.
project_ids = [123456789, 567891234]

unless PERSONAL_ACCESS_TOKEN
  abort "You must set a Personal Access Token to env var ASANA_PAT.\n"  \
    "Go to http://app.asana.com/-/account_api to create a personal access token."
end

# Create Asana client using the Asana Ruby client library
@client = Asana::Client.new do |c|
  c.authentication :access_token, PERSONAL_ACCESS_TOKEN
end


# Returns a hash of column/section ids and names for a given project
# Note that this script works for both types of projects -- boards
# which have columns and lists which have sections.
def get_columns(project_id)
	project_sections = @client.projects.find_by_id(project_id).sections
	sections = Hash.new
	project_sections.each do |section|
		sections[section.gid] = section.name
	end
	sections
end

# For a specified project, returns an array of the tasks that have custom field values.
def get_tasks_with_cf_values(project_id)
	tasks_cf_values = []
	tasks = @client.tasks.find_by_project({projectId: project_id, options: {expand: ["custom_fields"]}})
	tasks.each do |task|
		task.custom_fields.each do |cf|
			if cf.fetch("enum_value")
				cf_values = Hash.new
				cf_values["task-id"] = task.gid
				cf_values["name"] = cf["enum_value"]["name"]
				tasks_cf_values << cf_values
			end
		end
	end
	tasks_cf_values
end

# Compare tasks' custom field values to column/list names and move to correct section/column.
# This will effectively "pin" the task to the column with that custom field each time the
# script is run. (Note: for tasks *already* in the matching column, this will try to re-insert
# them into that column, but this is a safe operation which effectively does nothing in this case.)
def move_tasks_to_correct_column(project_id, project_columns, tasks_cf_values)
	tasks_cf_values.each do |custom_field|
		project_columns.each do |column_id, column_name|
			if (column_name == custom_field["name"]) || (column_name == (custom_field["name"] + ":"))
				task = @client.tasks.find_by_id(custom_field["task-id"])
				task.add_project(project: project_id, section: column_id)
				puts "Task " + "'" + task.name + "'" + " is in " + "'" + column_name + "'" + " column."
			end
		end
	end
end

# Runner method
# Pass an array of projects-ids to run the script
def runner(project_ids)
	project_ids.each do |project|
		columns = get_columns(project)
		tasks_cf_values = get_tasks_with_cf_values(project)
		move_tasks_to_correct_column(project, columns, tasks_cf_values)
	end
end

# Call the runner method to execute the script
runner(project_ids)


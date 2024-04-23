# This script uses python-asana: v5.0.6: https://pypi.org/project/asana/5.0.6/

import argparse
import asana
import os
import webbrowser
from datetime import date, datetime, timezone
from requests_oauthlib import OAuth2Session

client_id = os.environ['ASANA_CLIENT_ID']
client_secret = os.environ['ASANA_CLIENT_SECRET']

# Variables for performing OAuth
authorization_base_url = 'https://app.asana.com/-/oauth_authorize'
redirect_uri = 'urn:ietf:wg:oauth:2.0:oob'
token_url = 'https://app.asana.com/-/oauth_token'
scope = ['default']

def main():
    """
    Parse arguments, authorize user, and summarize each given project.
    """
    # Parse arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('summary_project_gid', help='project id of project to post summary task to')
    parser.add_argument(
        'projects',
        help='project id of project to summarize', 
        nargs='+',
        metavar='project_gid'
    )
    args = parser.parse_args()

    # Authorize the client
    try:
        client = authorize()
    except Exception as e:
        print(f"COULD NOT AUTHORIZE: {e}")
        exit(1)

    # Loop through projects, summarizing them.
    for idx, project_gid in enumerate(args.projects):
        print(f"Creating report for project {idx+1}/{len(args.projects)}...")
        summarize(client, project_gid, args.summary_project_gid)

# ==============================================================================
# HELPERS
# ==============================================================================
def authorize():
    """
    Perform OAuth to get an access_token and use the access_token to 
    setup the asana client.
    """

    oauth = OAuth2Session(client_id, redirect_uri=redirect_uri, scope=scope)
    
    # Get an authorization URL:
    authorization_url, state = oauth.authorization_url(authorization_base_url)
    webbrowser.open(authorization_url)

    # Get the code from the user. This code will be used to exchange for a token
    code = input('Copy and paste the returned code from the browser and press enter: ')

    # Fetch the token object
    # NOTE: this token object also contains the `refresh_token` in case you want to
    #       implement logic to retrieve a new access_token once the current access_token
    #       has expired.
    #
    # EX:
    # token_url = 'https://app.asana.com/-/oauth_token'
    # refresh_token = token['refresh_token']
    # token = oauth.refresh_token(
    #     token_url,
    #     refresh_token=refresh_token,
    #     client_id=client_id,
    #     client_secret=client_secret
    # )
    token = oauth.fetch_token(token_url, client_secret=client_secret, code=code)
    access_token = token['access_token']

    # Configure the asana client
    configuration = asana.Configuration()
    configuration.access_token = access_token
    client = asana.ApiClient(configuration)

    return client

def summarize(client, project_gid, post_project):
    """
    Collect data from project_gid, and create a summary task in the post_project.
    """
    # Create API instances for the resources we will be making requests to
    projects_api_instance = asana.ProjectsApi(client)
    tasks_api_instance = asana.TasksApi(client)

    # Get info on the project
    project = projects_api_instance.get_project(project_gid, {})

    # Data to collect:
    data = init_data(project)

    # Loop through the tasks, collecting data
    tasks = tasks_api_instance.get_tasks_for_project(
        project_gid,
        {
            'opt_fields': "completed,assignee,due_on,modified_at,custom_fields"
        }
    )
    for task in tasks:
        data = update_data(data, task)

    # Make the summary task
    tasks_api_instance.create_task(
         {
            'data': {
                'projects': [str(post_project)],
                'name': f"{date.today().isoformat()} Summary of \"{project['name']}\"",
                'html_notes': make_description(data)
            }
        },
        {}
    )

def init_data(project):
    """
    Initialize a data dictionary that will hold the summary data for the given
    project.
    """
    return {
        'tasks': 0,
        'tasks_completed': 0,
        'incomplete_tasks': 0,
        'incomplete_tasks_unassiged': 0,
        'incomplete_tasks_overdue': 0,
        'incomplete_tasks_with_due': 0,
        'last_activity_time': datetime.min.replace(tzinfo=timezone.utc),
        'custom_fields': {
            custom_field_setting['custom_field']['gid']: {
                'name': custom_field_setting['custom_field']['name'],
                'data': make_custom_field_data_dict(custom_field_setting['custom_field'])
            }
            for custom_field_setting in project['custom_field_settings']
        },
    }

def make_custom_field_data_dict(custom_field):
    """
    Creates a dictionary of initialized data for the custom field based on the
    type of custom field it is.
    """
    if custom_field['resource_subtype'] == 'enum':
        data = {
            custom_field_option['name']: 0
            for custom_field_option in custom_field['enum_options']
        }
        data[None] = 0
    elif custom_field['resource_subtype'] == 'multi_enum':
        data = {
            custom_field_option['name']: 0
            for custom_field_option in custom_field['enum_options']
        }
        data[None] = 0
    elif custom_field['resource_subtype'] == 'date':
        data = {
            'with date': 0,
            'without date': 0,
        }
    elif custom_field['resource_subtype'] == 'people':
        data = {
            'with people': 0,
            'without people': 0,
        }
    elif custom_field['resource_subtype'] == 'text':
        data = {
            'with text': 0,
            'without text': 0
        }
    elif custom_field['resource_subtype'] == 'number' and not custom_field['is_formula_field']:
        data = {
            'total': 0,
            'average': 0,
            'count': 0
        }
    elif custom_field['resource_subtype'] == 'number' and custom_field['is_formula_field']:
        data = {
            'count': 0
        }
    else:
        print(f"Unrecognized custom field subtype: {custom_field['resource_subtype']}")
        exit(1)

    return data


def update_data(data, task):
    """
    Given a data dictionary, returns the udpated data based on the given task
    object.
    """
    data['tasks'] += 1
    # Python datetime is bad and does not follow iso format conventions.
    # Replace the trailing Z for UTC time with something it recognizes
    last_activity_time = datetime.fromisoformat(task['modified_at'].replace('Z', '+00:00'))
    if last_activity_time > data['last_activity_time']:
        data['last_activity_time'] = last_activity_time

    # Bucket tasks
    if not task['completed']:
        data['incomplete_tasks'] += 1
        if task['due_on']:
            data['incomplete_tasks_with_due'] += 1
            if date.fromisoformat(task['due_on']) < date.today():
                data['incomplete_tasks_overdue'] += 1
        if not task['assignee']:
            data['incomplete_tasks_unassiged'] += 1
    else:
        data['tasks_completed'] += 1

    # Do custom field bucketing
    custom_fields = task['custom_fields']
    for custom_field in custom_fields:
        # Not all custom fields on the task are necessarily on the project!
        try:
            custom_field_data = data['custom_fields'][custom_field['gid']]['data']
        except KeyError:
            continue
        if custom_field['resource_subtype'] == 'enum':
            if custom_field['enum_value']:
                custom_field_data[custom_field['enum_value']['name']] += 1
            else:
                custom_field_data[None] += 1
        elif custom_field['resource_subtype'] == 'multi_enum':
            if custom_field['multi_enum_values']:
                for multi_enum_value in custom_field['multi_enum_values']:
                    custom_field_data[multi_enum_value['name']] += 1
            else:
                custom_field_data[None] += 1
        elif custom_field['resource_subtype'] == 'date':
            if custom_field['date_value']:
                custom_field_data['with date'] += 1
            else:
                custom_field_data['without date'] += 1
        elif custom_field['resource_subtype'] == 'people':
            if custom_field['people_value']:
                custom_field_data['with people'] += 1
            else:
                custom_field_data['without people'] += 1
        elif custom_field['resource_subtype'] == 'text':
            if custom_field['text_value']:
                custom_field_data['with text'] += 1
            else:
                custom_field_data['without text'] += 1
        elif custom_field['resource_subtype'] == 'number' and not custom_field['is_formula_field']:
            if custom_field['number_value']:
                num = float(custom_field['number_value'])
                count = custom_field_data['count']
                average = custom_field_data['average']
                custom_field_data['average'] = (average * count + num) / (count + 1)
                custom_field_data['count'] += 1
                custom_field_data['total'] += num
        elif custom_field['resource_subtype'] == 'number' and custom_field['is_formula_field']:
            if custom_field['number_value']:
                custom_field_data['count'] += 1
        else:
            print(f"Unrecognized custom field subtype: {custom_field['resource_subtype']}")
            exit(1)

    return data

def make_description(data):
    """
    Creates the string that will go into the description of the summary task.
    """
    description = "<body>"
    # Add project data
    description += "<u>Project</u>:\n"
    last_activity_date = data['last_activity_time'].date().isoformat()
    description += f"Last activity: <b>{last_activity_date}</b>\n"

    # Add task data
    description += "\n<u>All Tasks</u>:\n"
    description += f"<b>{data['tasks']}</b> tasks\n"
    description += make_item_description(
        "tasks are completed",
        data['tasks_completed'],
        data['tasks']
    )

    # Add incomplete task data
    description += "<u>\nIncomplete Tasks</u>:\n"
    description += f"<b>{data['incomplete_tasks']}</b> incomplete tasks\n"
    description += make_item_description(
        "incomplete tasks are unassigned",
        data['incomplete_tasks_unassiged'], 
        data['incomplete_tasks']
    )
    description += make_item_description(
        "incomplete tasks with due dates are overdue",
        data['incomplete_tasks_overdue'], 
        data['incomplete_tasks_with_due']
    )

    # Add custom field data
    if data['custom_fields']:
        description += "<u>\nCustom Fields</u>:"
        for custom_field in data['custom_fields'].values():
            description += f"<u>\n{custom_field['name']}</u>:\n"
            for key, value in custom_field['data'].items():
                description += f"{key}: <b>{value}</b>\n"

    # Add footer
    description += "\n\n<em>Made by the summary_task script.</em>"

    description += "</body>"

    return description

def make_item_description(description, numerator, denominator):
    """
    Makes an item description giving a number and a percentage based on the
    given numerator and denominator.
    """
    percentage = numerator / denominator if denominator != 0 else 0
    return f"<b>{numerator} ({percentage:.0%})</b> {description}\n"

if __name__ == '__main__':
    main()

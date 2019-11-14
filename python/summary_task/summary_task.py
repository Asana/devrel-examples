import asana
import json
from six import print_
from datetime import date, datetime, timezone
import argparse
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))


# OAuth Instructions:
#
# 1. create a new application in your Asana Account Settings ("App" panel)
# 2. set the redirect URL to "urn:ietf:wg:oauth:2.0:oob"
# 3. set your ASANA_CLIENT_ID and ASANA_CLIENT_SECRET environment variables
def authorize():
    """
    Look for tokens or client id/secret in env.
    Authorizes the script.
    """
    # Check if the user has an existing token stored.
    if 'ASANA_CLIENT_ID' in os.environ and 'ASANA_TOKEN' in os.environ:
        # Create a client with your OAuth client ID and a previously obtained 
        # bearer token
        client = asana.Client.oauth(
            client_id=os.environ['ASANA_CLIENT_ID'],
            token=json.loads(os.environ['ASANA_TOKEN'])
        )
        print_("authorized=", client.session.authorized)

        # Try to get something to see if token has not expired.
        try:
            client.users.me()
            return client
        except:
            print_("token expired. please update ASANA_TOKEN")

    # Check if the user has the secret
    if 'ASANA_CLIENT_ID' in os.environ and 'ASANA_CLIENT_SECRET' in os.environ:
        # Create a client with the OAuth credentials:
        client = asana.Client.oauth(
            client_id=os.environ['ASANA_CLIENT_ID'],
            client_secret=os.environ['ASANA_CLIENT_SECRET'],
            # This special redirect URI will prompt the user to copy/paste the 
            # code
            # Useful for command line scripts and other non-web apps
            redirect_uri='urn:ietf:wg:oauth:2.0:oob'
        )

        # Get an authorization URL:
        (url, state) = client.session.authorization_url()
        try:
            # In a web app you'd redirect the user to this URL when they take 
            # action to login with Asana or connect their account to Asana
            import webbrowser
            webbrowser.open(url)
        except Exception as e:
            print_("Open the following URL in a browser to authorize:")
            print_(url)

        print_("Copy and paste the returned code from the browser and press enter:")

        code = sys.stdin.readline().strip()
        # Exchange the code for a bearer token
        # Will fail on incorrect code
        token = client.session.fetch_token(code=code)

        print_("token=", json.dumps(token))

        # Normally you'd persist this token somewhere
        os.environ['ASANA_TOKEN'] = json.dumps(token) # (see below)
        return client
    return False

def summarize(client, project_id, post_project):
    """
    Collect data from project_id, and create a summary task in the post_project.
    """
    # Get info on the project
    project = client.projects.find_by_id(project_id)

    # Data to collect:
    data = init_data(project)

    # Loop through the tasks, collecting data
    task_fields = [
        'completed',
        'assignee',
        'due_on',
        'modified_at',
        'custom_fields',
    ]
    tasks = client.tasks.find_by_project(project_id, opt_fields=task_fields)
    for task in tasks:
        data = update_data(data, task)
        
    # Make the summary task
    summary_task_fields = {
        'projects': [str(post_project)],
        'name': "{} Summary of \"{}\"".format(
            date.today().isoformat(), project['name']),
        'html_notes': make_description(data)
    }
    client.tasks.create(**summary_task_fields)

def main():
    """
    Parse arguments, authorize user, and summarize each given project.
    """
    # Parse arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('summary_project_id',
        help='project id of project to post summary task to')
    parser.add_argument('projects',
        help='project id of project to summarize', 
        nargs='+',
        metavar='project_id')
    args = parser.parse_args()

    # Authorize the client
    client = authorize()
    if not client or not client.session.authorized:
        print_("COULD NOT AUTHORIZE")
        exit(1)

    # Loop through projects, summarizing them.
    for idx, project_id in enumerate(args.projects):
        print_("Creating report for project {}/{}...".format(
            idx+1, len(args.projects)))
        summarize(client, project_id, args.summary_project_id)


# ==============================================================================
# HELPERS
# ==============================================================================
def make_item_description(description, numerator, denominator):
    """
    Makes an item description giving a number and a percentage based on the
    given numerator and denominator.
    """
    return "<b>{} ({:.0%})</b> {}\n".format(
        numerator, numerator / denominator, description)

def make_description(data):
    """
    Creates the string that will go into the description of the summary task.
    """
    description = "<body>"
    # Add project data
    description += "<u>Project</u>:\n"
    description += "Last activity: <b>{}</b>\n".format(
        data['last_activity_time'].date().isoformat())

    # Add task data
    description += "\n<u>All Tasks</u>:\n"
    description += "<b>{}</b> tasks\n".format(data['tasks'])
    description += make_item_description(
        "tasks are completed",
        data['tasks_completed'],
        data['tasks'])

    # Add incomplete task data
    description += "<u>\nIncomplete Tasks</u>:\n"
    description += "<b>{}</b> incomplete tasks\n".format(
        data['incomplete_tasks'])
    description += make_item_description(
        "incomplete tasks are unassigned",
        data['incomplete_tasks_unassiged'], 
        data['incomplete_tasks'])
    description += make_item_description(
        "incomplete tasks with due dates are overdue",
        data['incomplete_tasks_overdue'], 
        data['incomplete_tasks_with_due'])

    # Add custom field data
    if data['custom_fields']:
        description += "<u>\nCustom Fields</u>:"
        for cf in data['custom_fields'].values():
            description += "<u>\n{}</u>:\n".format(cf['name'])
            for key, value in cf['data'].items():
                description += "{}: <b>{}</b>\n".format(key, value)

    # Add footer
    description += "\n\n<em>Made by the summary_task script.</em>"

    description += "</body>"

    return description

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
            cf['custom_field']['gid']: {
                'name': cf['custom_field']['name'],
                'data': make_cf_data_dict(cf['custom_field'])
            }
            for cf in project['custom_field_settings']
        },
    }

def make_cf_data_dict(custom_field):
    """
    Creates a dictionary of initialized data for the custom field based on the
    type of custom field it is.
    """
    if custom_field['resource_subtype'] == 'enum':
        data = {
            cf_option['name']: 0
            for cf_option in custom_field['enum_options']
        }
        data[None] = 0
    elif custom_field['resource_subtype'] == 'number':
        data = {
            'total': 0,
            'average': 0,
            'count': 0
        }
    elif custom_field['resource_subtype'] == 'text':
        data = {
            'with text': 0,
            'without text': 0
        }
    else:
        print_("Unrecognized custom field subtype")
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
    last_activity_time = datetime.fromisoformat(
        task['modified_at'].replace('Z', '+00:00'))
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
    cfs = task['custom_fields']
    for cf in cfs:
        # Not all custom fields on the task are necessarily on the project!
        try:
            cf_data = data['custom_fields'][cf['gid']]['data']
        except KeyError:
            continue

        if cf['resource_subtype'] == 'enum':
            if cf['enum_value']:
                cf_data[cf['enum_value']['name']] += 1
            else:
                cf_data[None] += 1
        elif cf['resource_subtype'] == 'number':
            if cf['number_value']:
                num = float(cf['number_value'])
                count = cf_data['count']
                average = cf_data['average']
                cf_data['average'] = (average * count + num) / (count + 1)
                cf_data['count'] += 1
                cf_data['total'] += num
        elif cf['resource_subtype'] == 'text':
            if cf['text_value']:
                cf_data['with text'] += 1
            else:
                cf_data['without text'] += 1
        else:
            print_("Unrecognized custom field subtype")
            exit(1)

    return data

if __name__ == '__main__':
    main()


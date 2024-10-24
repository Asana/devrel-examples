import os
import asana
from asana.rest import ApiException
from dotenv import load_dotenv
from pprint import pprint

# Load environment variables
load_dotenv()

# Configure Asana client
configuration = asana.Configuration()
configuration.access_token = os.getenv('PAT')
api_client = asana.ApiClient(configuration)

# Create an instance of the Webhooks API
webhooks_api_instance = asana.WebhooksApi(api_client)

# Helper function to update the X-Hook-Secret in the .env file
def update_x_hook_secret(new_secret):
    with open('.env', 'r') as file:
        content = file.readlines()
    
    with open('.env', 'w') as file:
        for line in content:
            if line.startswith('X_HOOK_SECRET='):
                file.write(f'X_HOOK_SECRET={new_secret}\n')
            else:
                file.write(line)
    
    print(f'The X-Hook-Secret stored in .env is: {new_secret}.')

# Helper function to read X-Hook-Secret from the .env file
def get_x_hook_secret():
    with open('.env', 'r') as file:
        for line in file:
            if line.startswith('X_HOOK_SECRET='):
                return line.split('=')[1].strip()
    return ""

# Function to delete the webhook
# Documentation: https://developers.asana.com/reference/deletewebhook
def delete_webhook(webhook_gid):
    try:
        api_response = webhooks_api_instance.delete_webhook(webhook_gid)
        print(f'Webhook {webhook_gid} deleted due to mismatch.')
    except ApiException as e:
        print(f"Exception when calling WebhooksApi->delete_webhook: {e}\n")

# Function to create the webhook
def create_webhook(target_uri, object_id, filter, resource_type):
    body = {
        "data": {
            "resource": object_id,
            "target": target_uri,
            "filters": [{"action": filter, "resource_type": resource_type}],
        }
    }

    opts = {}

    try:
        # Establish a webhook
        # Documentation: https://developers.asana.com/reference/createwebhook
        api_response = webhooks_api_instance.create_webhook(body, opts)
        
        pprint(api_response)

        x_hook_secret = api_response.get('X-Hook-Secret')  # TODO: Get X-Hook-Secret from Asana's 201 response (this currently doesn't work)
        print(x_hook_secret)
        stored_secret = get_x_hook_secret()
        print(stored_secret)

        if x_hook_secret != stored_secret:
            print(f'X-Hook-Secrets do not match! Deleting webhook with GID {api_response["gid"]}.')
            # delete_webhook(api_response["gid"]) # TODO: Comment this back in later on
        else:
            update_x_hook_secret(x_hook_secret)
            print("Webhook created successfully!")
            print(f'The GID of the newly-created webhook is: {api_response["gid"]}.')
            print(f'The X-Hook-Secret from Asana\'s response is: {x_hook_secret}.')

    except ApiException as e:
        print(f"Exception when calling WebhooksApi->create_webhook: {e}\n")

# Replace these values with your target URI, object ID, filter, and resource type
target_uri = '<YOUR_URL_HERE>'  # The webhook server's public endpoint
object_id = '<OBJECT_ID_HERE>'  # The Asana object ID you want to track (e.g., a task gid)
filter = 'changed'  # The action to filter for
resource_type = 'task'  # Specify the resource type

create_webhook(target_uri, object_id, filter, resource_type)

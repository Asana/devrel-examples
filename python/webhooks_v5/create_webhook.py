import os
import asana
from asana.rest import ApiException
from dotenv import load_dotenv
from pprint import pprint

# Load environment variables (for stored PAT and X-Hook-Secret)
load_dotenv()

# Configure Asana client
configuration = asana.Configuration()
configuration.access_token = os.getenv('PAT')
api_client = asana.ApiClient(configuration)

# Create an instance of the Webhooks API
webhooks_api_instance = asana.WebhooksApi(api_client)

# Helper function to read X-Hook-Secret from the .env file
def get_x_hook_secret():
    with open('.env', 'r') as file:
        for line in file:
            if line.startswith('X_HOOK_SECRET='):
                return line.split('=')[1].strip()
    return ""

# Function to delete the webhook
# Documentation: https://github.com/Asana/python-asana/blob/v5.0.11/docs/WebhooksApi.md#delete_webhook
def delete_webhook(webhook_gid):
    try:
        api_response = webhooks_api_instance.delete_webhook(webhook_gid)
        print(f'Webhook {webhook_gid} deleted due to mismatch.')
    except ApiException as e:
        print(f"Exception when calling WebhooksApi->delete_webhook: {e}\n")

# Function to create the webhook
# Documentation: https://github.com/Asana/python-asana/blob/v5.0.11/docs/WebhooksApi.md#create_webhook
def create_webhook(target_uri, object_id, filter, resource_type):
    body = {
        "data": {
            "resource": object_id,
            "target": target_uri,
            "filters": [{"action": filter, "resource_type": resource_type}],
        }
    }

    # Documentation: https://developers.asana.com/docs/inputoutput-options
    opts = {}

    try:
        # Establish a webhook
        # Note: This request disables default pagination behavior
        # (see https://github.com/Asana/python-asana?tab=readme-ov-file#disabling-default-pagination-behaviour)
        api_response = webhooks_api_instance.create_webhook(body, opts, full_payload=True)

        print("The complete API response for POST /webhooks is below:")
        pprint(api_response)

        webhook_gid = api_response["data"]["gid"]
        
        x_hook_secret = api_response.get('X-Hook-Secret')
        stored_secret = get_x_hook_secret()

        if x_hook_secret != stored_secret:
            print(f'X-Hook-Secrets do not match! Deleting webhook with GID {webhook_gid}')
            delete_webhook(api_response["data"]["gid"])
        else:
            print("Webhook created successfully!")
            print(f'The GID of the newly-created webhook is: {webhook_gid}')
            print(f'The X-Hook-Secret from Asana\'s response is: {x_hook_secret}')

    except ApiException as e:
        print(f"Exception when calling WebhooksApi->create_webhook: {e}\n")

# TODO: Replace these values with your target URI, object ID, filter, and resource type
target_uri = '<YOUR_URL_HERE>/receive_webhook'  # The webhook server's public endpoint
object_id = '<OBJECT_ID_HERE>'  # The Asana object ID you want to track (e.g., a task gid)
filter = 'changed'  # The action to filter for
resource_type = 'task'  # Specify the resource type

create_webhook(target_uri, object_id, filter, resource_type)

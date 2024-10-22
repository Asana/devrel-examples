import asana
from asana.rest import ApiException

# Configure the API client
configuration = asana.Configuration()
# Add your PAT below
# Documentation: https://developers.asana.com/docs/personal-access-token)
configuration.access_token = '<PERSONAL_ACCESS_TOKEN>'
api_client = asana.ApiClient(configuration)

# Create an instance of the API class
users_api_instance = asana.UsersApi(api_client)
# Identifies the user (can be "me" or the gid of a user)
user_gid = "me"

# Options for the API call
# Documentation: https://developers.asana.com/docs/inputoutput-options
opts = {
    'opt_fields': "name"
}

try:
    # Get a user
    # Documentation: https://developers.asana.com/reference/getuser
    api_response = users_api_instance.get_user(user_gid, opts)
    
    # Print the user's name
    print(f"Hello world! My name is {api_response['name']}")

except ApiException as e:
    print(f"Exception when calling UsersApi->get_user: {e}\n")

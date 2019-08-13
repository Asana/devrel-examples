import os
import asana

# replace with your personal access token.

# Check and set our environment variables
personal_access_token = None
if 'ASANA_PAT' in os.environ:
    personal_access_token = os.environ['ASANA_PAT']
else:
    print "No value for PAT in your console environment"
    print "Try running this as `ASANA_PAT=0/1234567890abcdef... python hello_world.py`"
    quit()

client = asana.Client.access_token(personal_access_token)

me = client.users.me()

print "Hello world! " + "My name is " + me['name'] + "."


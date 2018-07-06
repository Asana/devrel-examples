#!/usr/bin/env python

import asana
import sys
import os
import json
from asana.error import AsanaError

"""
Procedure for setting up this script to implement a ping bot:

1) Create a new Asana user to represent your bot. You can invite any email
address if you are an Asana admin by going to your profile at the top-right of
Asana.

If you are an Organization (the administrative menu item reads
"Organization Settings"), we recommend adding an email address outside of your
domain, i.e. if your email addresses end with @myorg.com, we recommend inviting
an email address that is *not* in @myorg.com. This will invite a limited-access
organization guest who can only access information which is explicitly
shared with them.
https://asana.com/guide/help/organizations/basics

If you are a Workspace (the menu item reads "Workspace Settings") you can
manually set users as "limited access members" on a case-by-case basis.
https://asana.com/guide/help/workspaces/people

2) Log into Asana as your bot
Using Incognito Mode, use the invitation link in the email of the bot to access
Asana.

3) Get a Personal Access Token for the bot

Go to https://app.asana.com/-/developer_console in the same incognito window
and create a Personal Access Token for your bot. This will only appear this
one time, so save it!

4) Set up your environment to have access to this token

While this isn't the most straightforward way to set this up, we recommend
that you do not just paste the personal access token in this script when
it runs. This is insecure in case anyone can get access to your source code,
and it's easy to share or accidentally post these credentials.

Instead, we have provided a template with configurable information that you can
adjust for your own situation when this script is run. It contains some items
to fill in including the personal access token.

Copy "template.json" to "config.json" and edit it to suit your configuration.
We will look for this file when we start up to get the information we need.

(you can also choose to set up a new user on your computer that has its own
execution environment - this is the most secure option, but takes care and
attention to get just right for securing the credentials).

Later, we will set up a recurring system called cron to run this command at
various intervals, so you won't have to worry about this every time.
"""




# Get configuration from the filled-in template file.

configuration_filename = "config.json"
configuration_path = os.path.realpath(
    os.path.join(os.getcwd(), configuration_filename))

try:
    configuration_file = open(configuration_path, 'r')
except FileNotFoundError as e:
    print("File not found. It must be exactly \"" +
          configuration_filename +
          "\" in the directory where pingbot.py is being run.")
    print(e)
    exit(-2)

# Get a python-asana client
client = asana.Client.access_token(pat)
# Be nice to Asana and let them know you're running this example.
# This is optional, and you can delete this line.
client.options['client_name'] = "Pingbot Example 1.0b"

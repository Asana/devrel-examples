#!/usr/bin/env python

import asana, sys, os, json, logging, signal, threading
from asana.error import AsanaError
from dateutil import parser

from dateutil import parser
from flask import Flask, request, make_response

"""
Procedure for using this script to log live webhooks:

* Create a new PAT - we're going to use ngrok on prod Asana, and don't want to give it long-term middleman access
  * https://app.asana.com/-/developer_console
* Set this PAT in the environment variable TEMP_PAT
  * export TEMP_PAT={pat}
* Set the workspace in the environment variable ASANA_WORKSPACE. This is required for webhooks.get_all
  * export ASANA_WORKSPACE={workspace_id}
* Set the project id in the environment variable ASANA_PROJECT
  * export ASANA_PROJECT={project_id}
* Run `ngrok http 8090`. This will block, so do this in a separate terminal window.
* Copy the subdomain, e.g. e91dadc7
* Run this script with these positional args:
  * First arg: ngrok subdomain
  * Second arg: ngrok port (e.g. 8090)
* Visit localhost:8090/all_webhooks to see your hooks (which don't yet exist)
and some useful links - like one to create a webhook
* Make changes in Asana and see the logs from the returned webhooks.

* Don't forget to deauthorize your temp PAT when you're done.
"""



# Check and set our environment variables
pat = None
if 'TEMP_PAT' in os.environ:
    pat = os.environ['TEMP_PAT']
else:
    print "No value for TEMP_PAT in env" 
    quit()

workspace = None
if 'ASANA_WORKSPACE' in os.environ:
    workspace = os.environ['ASANA_WORKSPACE'] 
else:
    print "No value for ASANA_WORKSPACE in env"
    quit()
 
project = None
if 'ASANA_PROJECT' in os.environ:
    project = os.environ['ASANA_PROJECT'] 
else:
    print "No value for ASANA_PROJECT in env" 
    quit()

# Get a python-asana client
client = asana.Client.access_token(pat)
# Be nice to Asana and let them know you're running this example.
# This is optional, and you can delete this line.
client.options['client_name'] = "Webhooks Example 1.0b"

app = Flask('Webhook inspector')
app.logger.setLevel(logging.INFO)

ngrok_subdomain = sys.argv[1]

# We have to create the webhook in a separate thread, because client.webhooks.create
# will block until the handshake is _complete_, but the handshake cannot be completed
# unless we can asynchronously respond in receive_webhook.
# If running a server in a server container like gunicorn, a separate process
# instance of this script can respond async.
class CreateWebhookThread(threading.Thread):
    def run(self):
        webhook = client.webhooks.create(resource=project, target="https://{0}.ngrok.io/receive-webhook".format(ngrok_subdomain))

create_thread = CreateWebhookThread()

def get_all_webhooks():
    webhooks = list(client.webhooks.get_all(workspace=os.environ["ASANA_WORKSPACE"]))
    app.logger.info("All webhooks for this pat: \n" + str(webhooks))
    return webhooks

@app.route("/create_webhook", methods=["GET"])
def create_hook():
    global create_thread
    # First, try to get existing webhooks
    webhooks = get_all_webhooks()
    if len(webhooks) != 0:
        return "Hooks already created: " + str(webhooks)
# Should guard webhook variable. Ah well.
    create_thread.start()
    return """<html>
    <head>
      <meta http-equiv=\"refresh\" content=\"10;url=/all_webhooks\" />
    </head>
    <body>
        <p>Attempting to create hook (may take up to 10s) Redirecting in 10s to <a href=/all_webhooks>/all_webhooks</a> to inspect.</p>
    </body>"""

@app.route("/all_webhooks", methods=["GET"])
def show_all_webhooks():
    return """<p>""" + str(get_all_webhooks()) + """</p><br />
<a href=\"/create_webhook\">create_webhook</a><br />
<a href=\"/remove_all_webhooks\">remove_all_webhooks</a>"""


@app.route("/remove_all_webhooks", methods=["GET"])
def teardown():
    retries = 5
    while retries > 0:
        webhooks = get_all_webhooks()
        if len(webhooks) == 0:
            return "No webhooks"
        for hook in webhooks:
            try:
                client.webhooks.delete_by_id(hook[u"id"])
                return "Deleted " + str(hook[u"id"])
            except AsanaError as e:
                print "Caught error: " + str(e)
                retries -= 1
                print "Retries " + str(retries)
        return ":( Not deleted. The webhook will die naturally in 7 days of failed delivery. :("


@app.route("/receive-webhook", methods=["POST"])
def receive_webhook():
    app.logger.info("Headers: \n" + str(request.headers));
    app.logger.info("Body: \n" + str(request.data));
    if "X-Hook-Secret" in request.headers:
        # Respond to the handshake request :)
        app.logger.info("New webhook")
        response = make_response("", 200)
        response.headers["X-Hook-Secret"] = request.headers["X-Hook-Secret"]
        return response
    elif "X-Hook-Signature" in request.headers:
        # Never verify signature :/ Not ideal, but this is just a toy app.
        contents = json.loads(request.data)
        app.logger.info("Received payload of %s events", len(contents["events"]))
        return ""
    else:
        raise KeyError

def signal_handler(signal, frame):
    print('You pressed Ctrl+C! Removing webhooks...')
    teardown()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

app.run(port=int(sys.argv[2]), debug=True)


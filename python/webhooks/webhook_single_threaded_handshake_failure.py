#!/usr/bin/env python

import asana, sys, os, json, logging, signal, threading, hmac, hashlib
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
* Visit localhost:8090/all_webhooks in your browser to see your hooks (which don't yet exist)
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

logger = logging.getLogger('biz_logic')
logger.setLevel(logging.INFO)
default_handler = logging.StreamHandler(sys.stdout)
default_handler.setFormatter(
    logging.Formatter("[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
)
logger.addHandler(default_handler)

ngrok_subdomain = sys.argv[1]

def get_all_webhooks():
    webhooks = list(client.webhooks.get_all(workspace=os.environ["ASANA_WORKSPACE"]))
    logger.debug("All webhooks for this pat: \n" + str(webhooks))
    return webhooks

# Go to "http://localhost:{port}/flask-create-webhook" to trigger this in-process webhook creation
@app.route("/flask-create-webhook", methods=["GET"])
def create_hook():
    webhooks = get_all_webhooks()
    if len(webhooks) != 0:
        return "Hooks already created: " + str(webhooks)

    # NOTE THIS LINE:
    # We're POSTing to the Asana create endpoint and Flask is running with "threaded=False"
    # This means this script will block until this call returns and will be unable to process the receive_webhook function below.
    try:
        logger.info("Creating webhook (and blocking the Python process until the call returns)")
        webhook = client.webhooks.create(resource=project, target="https://{0}.ngrok.io/flask-receive-webhook?project={1}".format(ngrok_subdomain, project))
    except asana.error.AsanaError as e:
        logger.info("Returned from webhook creation. Here is the error: {0}".format(e))
        return "We managed to fail the webhook handshake! This is the expected outcome for this example."
    return "We did not fail the webhook handshake! :( Sorry!"

# Sorry for the state-changing get, but we want this triggerable from the browser connected to this app :/
@app.route("/flask-remove-all-webhooks", methods=["GET"])
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

# Save a global variable for the secret from the handshake.
# This is crude, and the secrets will vary _per webhook_ so we can't make
# more than one webhook with this app, so your implementation should do
# something smarter.
hook_secret = None
@app.route("/flask-receive-webhook", methods=["POST"])
def receive_webhook():
    global hook_secret
    logger.debug("Headers: \n" + str(request.headers));
    logger.debug("Body: \n" + str(request.data));
    if "X-Hook-Secret" in request.headers:
        if hook_secret is not None:
            logger.warn("Second handshake request received. This could be an attacker trying to set up a new secret. Ignoring.")
        else:
            # Respond to the handshake request :)
            logger.info("New webhook handshake request! If this happens after the timeout error the webhook is already gone!")
            hook_secret = request.headers["X-Hook-Secret"]
            # We respond with 200 as if we're handling the handshake, but it's already too late.
            response = make_response("", 200)
            return response
    else:
        raise KeyError

def signal_handler(signal, frame):
    print('You pressed Ctrl+C! Removing webhooks...')
    teardown()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

# Note that threaded=False here - Flask can be configured to use
# a new thread per request, which is exactly what we're trying
# to show is a solution to this failure case.
app.run(port=int(sys.argv[2]), debug=True, threaded=False)

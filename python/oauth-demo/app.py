import os
import uuid
import requests
from flask import Flask, request, redirect, jsonify, session, send_from_directory
from dotenv import load_dotenv
import asana
from asana.rest import ApiException

# Load environment variables from the .env file
load_dotenv()

app = Flask(__name__)
# Secret Key: os.urandom(24) generates a random secret key each time the server starts.
# For sessions to persist across server restarts and work in a distributed environment, 
# set a consistent secret key (e.g., through environment variables) rather than using a random key.
app.secret_key = os.urandom(24)

# Serve the main HTML page (index.html) from the 'static' directory.
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/authenticate')
def authenticate():
    # Generate a state value and store it in the session
    state = str(uuid.uuid4())
    session['state'] = state

    # Redirect user to Asana's OAuth authorization endpoint
    # Documentation: https://developers.asana.com/docs/oauth#user-authorization-endpoint
    asana_url = (
        f"https://app.asana.com/-/oauth_authorize?response_type=code&client_id={os.getenv('CLIENT_ID')}"
        f"&redirect_uri={os.getenv('REDIRECT_URI')}&state={state}"
    )
    return redirect(asana_url)

@app.route('/oauth-callback')
def oauth_callback():
    # Get the state from the query parameters and compare it with the one stored in the session
    state = request.args.get('state')
    if state != session.get('state'):
        return "State mismatch. Possible CSRF attack.", 422

    # Get the code from the callback query
    code = request.args.get('code')

    # Payload for the token exchange
    # Documentation: https://developers.asana.com/docs/oauth#token-exchange-endpoint
    token_url = 'https://app.asana.com/-/oauth_token'
    data = {
        'grant_type': 'authorization_code',
        'client_id': os.getenv('CLIENT_ID'),
        'client_secret': os.getenv('CLIENT_SECRET'),
        'redirect_uri': os.getenv('REDIRECT_URI'),
        'code': code
    }

    # Make a POST request to exchange the code for an access token
    response = requests.post(token_url, data=data)
    if response.status_code == 200:
        # Extract tokens from the response
        tokens = response.json()
        access_token = tokens.get('access_token')
        refresh_token = tokens.get('refresh_token')

        # Store tokens in the session (in production setting, this would be stored securely in a datbase)
        session['access_token'] = access_token
        session['refresh_token'] = refresh_token

        # Redirect back to the main page with, now with the access token in the URL query
        return redirect(f"/?access_token={access_token}")
    else:
        return "Error exchanging code for token.", 500

# Make a simple GET request to /users/{user_gid} with the stored access token
# Documentation: https://developers.asana.com/reference/getuser
@app.route('/get-me')
def get_me():
    # See if the access token is available in the session
    access_token = session.get('access_token')
    if access_token:
        # Set up the Asana client using the access token
        configuration = asana.Configuration()
        configuration.access_token = access_token
        api_client = asana.ApiClient(configuration)

        # Create an instance of UsersApi
        users_api_instance = asana.UsersApi(api_client)
        # "me" is a special identifier that just represents the authenticated user
        user_gid = "me"

        # Set any options to include specific fields
        # Documentation: https://developers.asana.com/docs/inputoutput-options
        opts = {
        }

        try:
            # Fetch the authenticated user's info
            api_response = users_api_instance.get_user(user_gid, opts)
            # Return the full JSON body of the 200 OK response
            return jsonify(api_response) 
        except ApiException as e:
            return f"Exception when calling UsersApi->get_user: {e}", 500
    else:
        return redirect('/')

if __name__ == '__main__':
    app.run(debug=True, port=3000)

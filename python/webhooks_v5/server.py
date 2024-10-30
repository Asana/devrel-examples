import os
import hmac
import hashlib
import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from pprint import pprint

load_dotenv()

app = Flask(__name__)

# Helper function to read the X-Hook-Secret from the .env file
def get_x_hook_secret():
    with open('.env', 'r') as file:
        for line in file:
            if line.startswith('X_HOOK_SECRET='):
                return line.split('=')[1].strip()
    return ""

# Local endpoint for receiving events
@app.route('/receive_webhook', methods=['POST'])
def receive_webhook():
    print("Headers received:", request.headers)
    
    if 'X-Hook-Secret' in request.headers:
        new_secret = request.headers['X-Hook-Secret']
        update_x_hook_secret(new_secret)
        
        # Set the X-Hook-Secret in the response header
        response = jsonify()
        response.headers['X-Hook-Secret'] = new_secret
        return response, 200

    elif 'X-Hook-Signature' in request.headers:
        stored_secret = get_x_hook_secret()
        computed_signature = hmac.new(
            key=stored_secret.encode(),
            msg=request.data,
            digestmod=hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(request.headers['X-Hook-Signature'], computed_signature):
            return '', 401 # Fail
        else:
            print(f'Events on {datetime.datetime.now()}:')
            pprint(request.json['events'])
            return '', 200 # Success

    else:
        return 'Something went wrong!', 400

# Update the X-Hook-Secret in the .env file
def update_x_hook_secret(new_secret):
    with open('.env', 'r') as file:
        content = file.readlines()

    with open('.env', 'w') as file:
        for line in content:
            if line.startswith('X_HOOK_SECRET='):
                file.write(f'X_HOOK_SECRET={new_secret}\n')
            else:
                file.write(line)

if __name__ == '__main__':
    app.run(port=8080)

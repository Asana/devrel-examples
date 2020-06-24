# OAuth Server Example

This example shows how to get started with the confidential client authorization code flow. For this tutorial, we will 
utilize API Gateway and Lambda from AWS, but you can alter this code to use any server you prefer.

This is useful for apps to get started with a simple server.

### Basics

You can read more about what OAuth is in this [blog post from Okta](https://developer.okta.com/blog/2017/06/21/what-the-heck-is-oauth).

The moving parts
* A Client (Browser)
* An App Server (Google function, Amazon Lambda, or a full server)
* An Authorization Server (Asana)

Here is a simplified rundown of the steps we will complete:

1. A Browser (the Client) goes to your App Server URL to get a webpage.
2. The Client clicks `Authenticate with Asana` on your webpage.
3. Your webpage asks your App Server to create state and return some required oauth info.
4. Your webpage redirects the Client to Asana's authorization endpoint.
5. The Client clicks `Accept` at Asana's authorization endpoint.
6. Asana redirects the Client back to your App Server with a code.
7. The App Server returns your webpage, which tells the Client how to handle this code.
8. Your webpage sends the code to your App Server
9. Your App Server sends the code to Asana.
10. Asana returns an access_token
11. Your app server gives the user the access_token

Sounds easy, right? Lets start with a server. 

## The Server

For this example we're going to use AWS Lambda. Lambda functions are an easy way to satisfy the server 
requirement without too much overhead. And until you get too much traffic, they're free!

1. Clone this repo or clone the contents of `/server`.
2. run `npm install` from within `/server`
3. zip up the contents of server. From within the folder, select all the files (including `node_modules`) and click `compress` or `send to: zip`.
4. Login to [AWS Console](https://console.aws.amazon.com/).
5. Create a [Lambda Function](https://console.aws.amazon.com/lambda)
    1. Author from Scratch
    2. Name it. I'm using "my-app-lambda".
    3. Node.js 12.x
    4. Create a new role with basic Lambda permissions
6. Upload your zip. 
    1. Handler should be index.handler
7. Set environment variables
    1. client_id (get this from the Developer Console in Asana)
    2. client_secret (also in the Developer Console)
    3. oauth_authorize_endpoint (should be "https://app.asana.com/-/oauth_authorize")
    4. token_exchange_endpoint (should be "https://app.asana.com/-/oauth_token")
    5. redirect_uri (wherever your front end is hosted, if there's multiple, split them with commas "https://your_front_end_location.com/,http://localhost:8338/")
8. Hit "Save" in the top right, and then pick "Actions -> Publish New Version"
9. Click "Add Trigger" on the left, and pick "API Gateway".
    1. Pick "Create an API"
    2. API type "REST API"
    3. Security "Open"
10. Go to your newly created API Gateway, and on the left hit Stages.
    1. Expand "default" and click "GET" under your lambda function name.
    2. Copy the "Invoke Url" at the top
11. In `/client/index.html` on line 17, replace "{your_token_url}" with your Invoke URL.
    1. Either host your front end on a server or host it locally. I prefer to host it locally with `python -m SimpleHTTPServer 8338`.
    
## Debugging

Lambda has many different security permissions all over the place. If you run into something not working, inspect your 
webpage and watch the network traffic. If you need help, create a github issue with the contents of your failing network 
call.

## All done!

You should be able to authenticate using your API Gateway and Lambda function. The code is fairly straightforward, so 
feel free to look around and learn whats happening. This tutorial gets you up and running with your own OAuth server, 
but you should read up on OAuth and ensure you understand whats happening. It's easy to make a mistake when you're 
unfamiliar with OAuth, and a mistake here can expose user data.

## Issues

If you have any issues with this, please create an Issue in this github repo. Common issues will be placed here to help 
others!

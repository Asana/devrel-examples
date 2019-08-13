var asana = require('asana');

// replace with your personal access token.
var personalAccessToken = '0/123456789....';

// construct an Asana client
var client = asana.Client.create().useAccessToken(personalAccessToken);

// Get your user info
client.users.me()
  .then(function(me) {
    // Print out your information
    console.log('Hello world! ' + 'My name is ' + me.name + '.');
});

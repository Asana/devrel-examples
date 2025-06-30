const Asana = require('asana');

// Set up the API client and authenticate with a personal access token
let client = Asana.ApiClient.instance;
let token = client.authentications['token'];
token.accessToken = '<PERSONAL_ACCESS_TOKEN'; // Replace with your PAT

// Create an instance of the Users API
let usersApi = new Asana.UsersApi();

// Define user identifier
let user_gid = 'me';

// Define options
let opts = {
  opt_fields: 'name'
};

// Call the API to get user info
usersApi.getUser(user_gid, opts).then(
  (result) => {
    console.log(`Hello world! My name is ${result.data.name}.`);
  },
  (error) => {
    console.error('Error fetching user:', error.response?.body || error);
  }
);

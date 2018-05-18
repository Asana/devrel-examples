require 'asana'

# replace with your personal access token. 
personal_access_token = '0/123456789....'

# Construct an Asana client
client = Asana::Client.new do |c|
  c.authentication :access_token, personal_access_token
end

# Get your user info
me = client.users.me
# Print out your information
puts "Hello world! " + "My name is " + me.name + " and I my primary Asana workspace is " + me.workspaces[0].name + "."


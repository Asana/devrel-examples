# Asana Goals Demo
This Python project showcases the Asana Goal APIs by fetching data from a
SalesForce instance. 

### Getting Started
First, clone this project via git:
```bash
$ git clone https://github.com/alan-at-asana/goals-api-sfdc.git
```

If you would like to run this in a local Python virtual environment create one
with ```virtualenv```. If you would like to use docker instead build the image
with the given Dockerfile. The following example build command creates an image
tagged ```asana-goals-demo```.
```bash
$ docker build -t asana-goals-demo .
```

This package runs as a module so either install locally or in editable mode and
run it as one.
To install in editable mode and run the project:
```bash
(venv) $ pip install -e .
(venv) $ python -m asana_goals -h
```

### Configuring
To test the functionality of this project you require two things:
- An Asana account authorized to make service accounts
- A Salesforce developer organization

#### Configuring Asana
Provided you have access to service accounts, enter the Asana admin console and
create a new service account. We will use the generated access token for the
following steps.

As finding API names can be a time hog, run this application providing your
access token as a command line argument:
```bash
(venv) $ python -m asana_goals -i "MY_ACCESS_TOKEN"
```

This will return a list of workspaces available. Let's try again using the
desired workspace:
```bash
(venv) $ python -m asana_goals -i "MY_ACCESS_TOKEN" -w "WORKSPACE_GID"
```

Now we get a list of time periods. Choose your desired time period and run the
application one last time:
```bash
(venv) $ python -m asana_goals -i "MY_ACCESS_TOKEN" -w "WORKSPACE_GID" -t "TIME_PERIOD_ID"
```

A bunch of example goals will have been created in your Asana workspace. As no
config_file argument was provided the default is to create the file as
```config.toml``` in the current working directory.

#### Configuring Salesforce
In order to get a Salesforce developer environment register at
```https://developer.salesforce.com/signup```. Save your username in the project
```config.toml``` file in the ```username``` entry.

Once you have your developer organization, make enter the Setup menu by clicking
the wheel icon to the top right.

![Access the setup menu](docs/screenshots/01_access_setup.png)

Use the search bar in the Setup menu on the left side to look for "Certificate
and Key Management". In here, create a self-signed certificate. This is what we
will use to access the REST API. Make sure to give it a convenient name and
download the certificate. This will yield a `<FILENAME>.crt` file.

![Create self-signed option](docs/screenshots/02_create_selfsig.png)
![Label the self-signed certificate](docs/screenshots/03_create_selfsig_label.png)
![Download the self-signed certificate](docs/screenshots/04_download_selfsig.png)

This only exports the public key, however. In order to download the private key,
you need to export to a keystore from the certificate management page. This time
you should have an option "Export to Keystore". Set any convenient passphrase
and download the private key. The key is sent in a Java keystore format, with a
filename `<FILENAME>.jks`.

![Export to Keystore option](docs/screenshots/05_export_selfsig.png)

Provided you have Java keytool and OpenSSL, in order to convert this keystore to
a PEM format private key run the following commands using the same passphrase
you set on the "Export to Keystore" screen:
```bash
$ keytool -importkeystore -srckeystore <FILENAME>.jks -destkeystore keys.p12 -deststoretype PKCS12
$ openssl pkcs12 -in keys.p12 -nodes -nocerts -out key.pem
```

If you have not edited this console command, copy the ```key.pem``` file to the
project directory and set the ```private_key_file``` entry in ```config.toml```
to ```key.pem```.

Once you have your private key, make sure to set the certificate as API client
certificate for your organization. On the lower side section "API Client
Certificate" click "Edit" and set your new self-signed as client certificate.

![Edit API client certificate option](docs/screenshots/06_edit_api_client_cert.png)
![Set API client certificate](docs/screenshots/07_set_api_client_cert.png)

With that done you should now use the left-side setup search to look for "App
Management" and create a new connected application with the top-right option
"New Connected App". Set any convenient name for the application, and make sure
to enable OAuth. Use any placeholder callback URL as this will not be used. Tick
the "Use digital signatures" option and upload the self-signed certificate
```<FILENAME.crt>``` you previously downloaded. Enable the following OAuth
scopes:
- Access and manage your data (api)
- Perform requests on your behalf at any time (refresh_token, offline_access)

![App Manager screen](docs/screenshots/08_app_manager.png)
![Setting up basic app information](docs/screenshots/09_app_basic_info.png)
![Setting up OAuth app information](docs/screenshots/10_app_oauth_info.png)

Go back to the App Manager and your new App should be there. Now click on the
menu next to it, and select the "Manage" option. On this screen click the "Edit 
policies" button and scroll to the OAuth policies section. Set Permitted Users
to "Admin approved users are pre-authorized" and set IP relaxation to "Relax IP 
restrictions" to avoid access issues.

![App Manager manage](docs/screenshots/11_manage_app.png)
![Edit app policies](docs/screenshots/12_edit_app_policies.png)
![New app policies](docs/screenshots/13_new_app_policies.png)

Now again, back in the App Manager this time click the "View" option on your
app. Your consumer key should be visible here. Copy it and paste it in the
```client_id``` entry in your ```config.toml``` file.

![App Manager view](docs/screenshots/14_view_app.png)
![Copy app consumer key](docs/screenshots/15_consumer_key.png)

Now search for "Users" in the left-side setup menu and open the view. Your user
should be visible and have the profile "System Administrator". Click the profile
name and then click "Edit". In the "Connected App Access" section tick your app
to enable it.

![View users](docs/screenshots/16_users.png)
![View profile](docs/screenshots/17_view_profile.png)
![Edit custom app settings](docs/screenshots/18_custom_app_settings.png)

With this done you now have access to the Salesforce REST API. To get data from
this instance you need to either create a report, or install the following
unmanaged package that will create the report for you:
```
https://login.salesforce.com/packaging/installPackage.apexp?p0=04t5f000000QLiN
```
Replace "login.salesforce.com" with your developer org URL, which usually has
the format "name-dev-ed.lightning.force.com". This will yield a page that allows
to install the package for all users.

![Install package](docs/screenshots/19_install_package.png)

Now open the app launcher, which is the square tiles menu on the upper-left
side, and enter the "Sales" app. Here, navigate to the "Report" tab, which is on
the "More" menu if not on screen and click "All Reports" on the left-side menu
to view all reports. There should be one named "Won opportunities". Open it and
the report ID will be visible in the URL.

![Sales in App launcher](docs/screenshots/20_sales_app.png)
![View reports list](docs/screenshots/21_reports_list.png)
![View report](docs/screenshots/22_report.png)

If you are using the default examples, set this report ID on the key
```sf_report_id``` in the ```[goals.example_1]``` section.

### Running
To run this application once just drop in your shell:
```bash
(venv) $ python -m asana_goals
```

To run it as a long polling service do the following instead:
```bash
(venv) $ python -m asana_goals -s
```
# Field Analysis script

The Field Analysis Python script is used to generate a CSV of [custom fields](https://developers.asana.com/docs/custom-fields-guide) in an Asana instance. Additionally, the script outputs a count of how frequently each field is used.

## Requirements

This script is written using Python 3.8, though it should be compatible with most 3.x versions of Python.

To check the version of Python installed on your local machine, open your terminal and enter the following command:

```
python -V
```

If you need to install a newer version of Python, you can do so at https://www.python.org/downloads/

_Note: If you install a newer version of Python, be sure to also install certificates (by running the "install certificates" script found in the Python folder)._

## Installation

```
pip install -r requirements.txt
```

## Usage

Before you begin, be sure to obtain a [personal access token](https://developers.asana.com/docs/personal-access-token) (PAT). This personal access token is how the script authenticates with Asana to create these projects as your Asana user.

Then, to use the Field Analysis script:

```
python runfieldanalysis.py
```

The script interactively asks for both your personal access token and workspace GID (you will also be given an option of possible workspaces to analyze). Note that large domains can take an extended period of time!

## Output

The standard information outputted in the resulting CSV file are each field's:

* `gid`
* `name`
* `type`
* `created_by` (names and emails)
* `enum_options` (names)

Along with the output above, the CSV file also indicates a **count** representing the number of _projects_ the field is used in. Note that this does _not_ include portfolios.

To get more information on a custom field, you can request the custom field record by using its GID with the Asana API, as documented here: [GET /custom_fields/{custom_field_gid}](https://developers.asana.com/reference/getcustomfield)

## Rate limits

Due to the high volume of API calls this script makes, it may sometimes hit [rate limits](https://developers.asana.com/docs/rate-limits) and need to set some delay between its API calls. The exact amount of delay will be printed to the console. 

Because the script will be running many calls in parallel, note that this message may print multiple times (i.e., once for each API call that was blocked due to rate limiting). These wait times will not be additive, since the calls are running in parallel. Once the wait duration is up, each API call will be retried with increasing delay until it succeeds. After ~10 tries (which would take almost 3 minutes of attempts), the individual API call will be canceled.

## Additional notes

* All source code is contained within the `fieldanalysis` directory
    * The `fieldanalysis()` function within `fieldanalysis.py` coordinates all other functionality of the script
* `menu.py` contains the menu and a few helper functions to gather user input and map the CSV to the portfolio fields
* The `asanaUtils` directory contains a `client.py` file, which handles formatting and sending API calls, along with handling rate limits

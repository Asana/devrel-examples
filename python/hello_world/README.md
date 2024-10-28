# 'Hello World' Script

This simple script demonstrates how to use the [Asana Python library](https://developers.asana.com/docs/python) to retrieve and display the name of a user associated with a [personal access token (PAT)](https://developers.asana.com/docs/personal-access-token). It outputs a simple "Hello world" message that includes the user's name.

## Requirements
- Python 3.x
- Asana Python library ([PyPI](https://pypi.org/project/asana/))

## Installation

1. Install the library with `pip`:

```
pip install asana
```

2. Obtain a personal access token (PAT)

- Follow the instructions in the [API documentation](https://developers.asana.com/docs/personal-access-token) to create a PAT
- Be sure to copy your PAT for use in the script

## Usage

1. With this project cloned to your local machine, navigate to the directory containing this **hello_world.py** script
2. Edit the script and replace `<PERSONAL_ACCESS_TOKEN>` with your actual PAT
3. Run the script:

```
python hello_world.py
```

## Expected output:

When you run the script successfully, you should see an output similar to:

```
Hello world! My name is <your name>
```

If there is an error, such as an invalid token or a network issue, you will see a message indicating the exception.

## Troubleshooting
- **Invalid token**: Ensure that your PAT is correct and active
- **Network issues**: Check your internet connection and firewall settings if you encounter connectivity problems
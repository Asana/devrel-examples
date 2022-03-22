import os.path
import pprint
from typing import Optional

from asana_goals.asana import Asana

example_1 = (
    {
        "data": {
            "due_on": None,
            "notes": "Goals API Example\n\nIn this example, we connect a Salesforce report to the metrics of this Asana Goal. As opportunities are closed in Salesforce, a report is updated and the summed value is written into this goal metrics.\n\nThe development project helps check the goal format to make sure it's a currency value. It also checks the progress and automatically sets the status.\n\n    On Track \u2192 66% or more of the goal metric currency\n    At Risk \u2192 between 33% and 66% of the goal metric currency\n    Off Track \u2192 less than 33% of the goal metric\n\n",
            "name": "Example 1: Goal to hit a sales target",
            "html_notes": "<body><strong>Goals API Example</strong>\n\nIn this example, we connect a Salesforce report to the metrics of this Asana Goal. As opportunities are closed in Salesforce, a report is updated and the summed value is written into this goal metrics.\n\nThe development project helps check the goal format to make sure it's a currency value. It also checks the progress and automatically sets the status.\n\n<ul><li>On Track \u2192 66% or more of the goal metric currency</li><li>At Risk \u2192 between 33% and 66% of the goal metric currency</li><li>Off Track \u2192 less than 33% of the goal metric</li></ul>\n</body>",
            "time_period": None,
            "workspace": None,
        },
    }, {
        "precision": 2,
        "unit": "currency",
        "currency_code": "USD",
        "initial_number_value": 0,
        "target_number_value": 5000000,
        "current_number_value": 0
    }
)

example_2 = (
    {
        "data": {
            "due_on": None,
            "notes": "In this example, we explore how to automate Goals graded based on the weighting of sub-goals. For example, a goal may often be split into many sub-goals and the progress of each of the sub-goals could account for different weights. One sub-goal may be 50% of the score while another may be only 25%.\n\nThis example demonstrates how you can create a custom weighted formula and automatically update the progress on the parent goal. The simple formula here is:\n\n    Progress of Parent Goal is equal to the summation of the weighted sub-goals:\n        50% - Sub-Goal 1\n        30% - Sub-Goal 2\n        20% - Sub-Goal 3\n\nSo for example, if sub-goal 1 has 47% progress, sub-goal 2 has reach 122, and sub-goal 3 has reached $62,000 then the resulting progress will be calculated as:\n\n    Parent Goal Progress (%) = 0.5*(47) + 0.3*(122/200)*100 + 0.2*(62,000/100,000)*100\n\n",
            "name": "Example 2: A Goal metric based on a custom weighting of sub-goals",
            "html_notes": "<body>In this example, we explore how to automate Goals graded based on the weighting of sub-goals. For example, a goal may often be split into many sub-goals and the progress of each of the sub-goals could account for different weights. One sub-goal may be 50% of the score while another may be only 25%.\n\nThis example demonstrates how you can create a custom weighted formula and automatically update the progress on the parent goal. The simple formula here is:\n\n<ul><li>Progress of Parent Goal is equal to the summation of the weighted sub-goals:</li><ul><li>50% - Sub-Goal 1</li><li>30% - Sub-Goal 2</li><li>20% - Sub-Goal 3</li></ul></ul>\nSo for example, if sub-goal 1 has 47% progress, sub-goal 2 has reach 122, and sub-goal 3 has reached $62,000 then the resulting progress will be calculated as:\n\n<ul><li>Parent Goal Progress (%) = 0.5*(47) + 0.3*(122/200)*100 + 0.2*(62,000/100,000)*100</li></ul>\n</body>",
            "time_period": None,
            "workspace": None,
        }
    }, {
        "precision": 0,
        "unit": "percentage",
        "currency_code": None,
        "initial_number_value": 0,
        "target_number_value": 1,
        "current_number_value": 0,
    }
)

subgoal_1 = (
    {
        "data": {
            "due_on": None,
            "notes": "",
            "name": "Example sub-goal 1",
            "html_notes": "<body></body>",
            "time_period": None,
            "workspace": None,
        }
    }, {
        "precision": 0,
        "unit": "percentage",
        "currency_code": None,
        "initial_number_value": 0,
        "target_number_value": 1,
        "current_number_value": 0.92,
    },
)

subgoal_2 = (
    {
        "data": {
            "due_on": None,
            "notes": "",
            "name": "Example sub-goal 2",
            "html_notes": "<body></body>",
            "time_period": None,
            "workspace": None,
        }
    }, {
        "precision": 0,
        "unit": "none",
        "currency_code": None,
        "initial_number_value": 0,
        "target_number_value": 200,
        "current_number_value": 40,
    },
)

subgoal_3 = (
    {
        "data": {
            "due_on": None,
            "notes": "",
            "name": "Example sub-goal 3",
            "html_notes": "<body></body>",
            "time_period": None,
            "workspace": None,
        }
    }, {
        "precision": 2,
        "unit": "currency",
        "currency_code": "USD",
        "initial_number_value": 0,
        "target_number_value": 100000,
        "current_number_value": 58000,
    },
)

config_file = """\
[asana]
# Your Asana API access token. You need to create a service account to acquire
# this.
access_token="{asana_access_token}"

[salesforce]
# Your salesforce username, usually in a mail address-like format.
username="<YOUR SALESFORCE USERNAME HERE>"
# Your Salesforce app client ID. Check README.md for the procedure for
# acquiring this.
client_id="<YOUR SALESFORCE APP CLIENT ID HERE>"
# Your private key file in PEM format. Check README.md for the procedure for
# # acquiring this.
private_key_file="<YOUR SALESFORCE SELF-SIGNED PRIVATE KEY HERE>"

[app]
# Run this every 1 minute
cron_string="*/1 * * * *"
# We have 2 goals to keep track of, these are configured in the next section
goals=[
    "example_1",
    "example_2"
]

[goals]

    # First example fetches data from salesforce
    [goals.example_1]
    goal_id="{example_1_gid}"
    source="salesforce_report"
    sf_report_id="<YOUR SALESFORCE REPORT ID HERE>"
    sf_metric="s!AMOUNT"

    # Second example calculates its progress by measuring subgoals
    [goals.example_2]
    goal_id="{example_2_gid}"
    source="composite"
    subgoals=[
        "subgoal_1",
        "subgoal_2",
        "subgoal_3",
    ]
    weights=[
        0.4,
        0.1,
        0.5
    ]

    # These subgoals have a fixed value
    [goals.subgoal_1]
    goal_id="{subgoal_1_gid}"
    source="fixed"
    value="0.92"

    [goals.subgoal_2]
    goal_id="{subgoal_2_gid}"
    source="fixed"
    value="40"

    [goals.subgoal_3]
    goal_id="{subgoal_3_gid}"
    source="fixed"
    value="58000"

# This gets fed into Python logging.config.dictConfig
# For a tutorial on options available see:
# https://docs.python.org/3/howto/logging.html#logging-basic-tutorial
[logging]
version=1

    [logging.formatters.simple]
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    [logging.handlers.console]
    class="logging.StreamHandler"
    level="DEBUG"
    formatter="simple"
    stream="ext://sys.stdout"

    [logging.root]
    level="INFO"
    handlers=["console"]
"""


class InitializerProcess:
    config_filename: str
    asana: Asana
    workspace_gid: Optional[str]
    time_period_gid: Optional[str]

    _access_token: str

    def __init__(self, config_filename: Optional[str], access_token: str,
                 workspace_gid: str = None, time_period_gid: str = None) -> None:
        """
        This class creates a config file given some arguments.
        :param config_filename: Filename to write to,
        :param access_token: Asana API access token.
        :param workspace_gid: Asana workspace GID.
        :param time_period_gid: Asana time period GID for goals.
        """
        if not config_filename:
            self.config_filename = "./config.toml"
        else:
            self.config_filename = config_filename
        self._access_token = access_token
        self.asana = Asana(access_token)
        self.workspace_gid = workspace_gid
        self.time_period_gid = time_period_gid

    def discover_workspaces(self) -> None:
        """
        Uses the Asana API to display the available workspaces for the current
        access token.
        :return:
        """
        workspaces = self.asana.get_workspaces()
        pprint.pp(workspaces)

    def discover_time_periods_in_workspace(self) -> None:
        """
        Uses the Asana API to display the available workspaces for the current
        access token and workspace.
        """
        if not self.workspace_gid:
            raise ValueError("Workspace GID must be provided to use this option.")
        time_periods = self.asana.get_time_periods_for_workspace(self.workspace_gid)
        pprint.pp(time_periods)

    def initialize_asana(self) -> None:
        """
        Initializes the current Asana workspace with a series of example goals
        created with the provided time period.
        """
        if not self.workspace_gid:
            raise ValueError("Workspace GID must be provided to use this option.")

        if not self.time_period_gid:
            raise ValueError("Time period GID must be provided to use this option.")

        for goal, metric in [example_1, example_2, subgoal_1, subgoal_2, subgoal_3]:
            # Set the provided IDs
            goal["data"]["workspace"] = self.workspace_gid
            goal["data"]["time_period"] = self.time_period_gid

        # Create by steps
        examples = []
        for goal, metric in [example_1, example_2]:
            examples.append(self.asana.create_goal(goal))
            self.asana.create_goal_metric(examples[-1].gid, metric)

        # Create subgoals by steps and attach to example 2
        sub_examples = []
        for goal, metric in [subgoal_1, subgoal_2, subgoal_3]:
            sub_examples.append(self.asana.create_goal(goal))
            self.asana.create_goal_metric(sub_examples[-1].gid, metric)
            self.asana.add_subgoal(examples[-1].gid, sub_examples[-1].gid)

        with open(self.config_filename, "w") as f:
            f.write(config_file.format(
                asana_access_token=self._access_token,
                example_1_gid=examples[0].gid,
                example_2_gid=examples[1].gid,
                subgoal_1_gid=sub_examples[0].gid,
                subgoal_2_gid=sub_examples[1].gid,
                subgoal_3_gid=sub_examples[2].gid,
            ))

    def main(self) -> int:
        """
        Main function. Return exit status code.
        """
        if os.path.exists(self.config_filename):
            print("WARNING: You are about to overwrite your config file.")
            reply = input("Input Y to accept: ")
            if reply != "Y":
                print("ERROR: Not overwriting, aborting")
                return -1

        if not self.workspace_gid:
            print("ERROR: A workspace GID is required to initialize the goal entries.")
            print("The following workspaces are available:")
            self.discover_workspaces()
            return -1

        if not self.time_period_gid:
            print("ERROR: A time period GID is require to initialize the time period entries.")
            print("The following time periods are available:")
            self.discover_time_periods_in_workspace()
            return -1

        print("Initializing Asana workspace...")
        self.initialize_asana()
        print("Config written to " + self.config_filename)
        return 0

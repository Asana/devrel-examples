from unittest import TestCase
from unittest.mock import patch, mock_open

from asana_goals.__main__ import MainProcess

test_config = """
[asana]
access_token="<YOUR ACCESS TOKEN HERE>"

[salesforce]
username="<YOUR SALESFORCE USERNAME>"
client_id="<APP CLIENT ID>"
private_key_file="<YOUR PRIIVATE KEY FILE>"

[app]
cron_string="*/5 * * * *"
goals=[
    "nmv_growth",
    "general_progress"
]

[goals]

    [goals.nmv_growth]
    goal_id="1201008336897091"
    source="salesforce_report"
    sf_report_id="00O5f0000011TjQEAU"
    sf_metric="s!AMOUNT"

    [goals.general_progress]
    goal_id="1201031555453677"
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

    [goals.subgoal_1]
    goal_id="1201031555453678"
    source="fixed"
    value="0.92"

    [goals.subgoal_2]
    goal_id="1201031555453680"
    source="fixed"
    value="40"

    [goals.subgoal_3]
    goal_id="1201031555453682"
    source="fixed"
    value="58000"
"""


class TestMain(TestCase):
    @patch("asana_goals.__main__.Asana", autospec=True)
    @patch("asana_goals.__main__.Salesforce", autospec=True)
    @patch("builtins.open", new_callable=mock_open, read_data=test_config)
    def test_single_run_does_not_sleep(self, asana_mock, sf_mock, open_mock):
        process = MainProcess("test_config", False)
        process.main()

        # Should have exited and not looped
        assert asana_mock.called
        assert sf_mock.called

import json
from unittest import TestCase
from copy import deepcopy

import requests
import responses

from asana_goals.asana.client import Asana
from asana_goals.asana.goal import Goal, GoalStatus

test_goal = {
    "data": {
        "gid": "12345",
        "resource_type": "goal",
        "name": "Grow web traffic by 30%",
        "owner": {
            "gid": "12345",
            "resource_type": "user",
            "name": "Greg Sanchez"
        },
        "due_on": "2019-09-15",
        "html_notes": "<body>Start building brand awareness.</body>",
        "is_workspace_level": True,
        "liked": False,
        "metric": {
            "gid": "12345",
            "resource_type": "task",
            "currency_code": "EUR",
            "current_display_value": "8.12",
            "current_number_value": 8.12,
            "initial_number_value": 5.2,
            "precision": 2,
            "resource_subtype": "number",
            "target_number_value": 10.2,
            "unit": "none"
        },
        "notes": "Start building brand awareness.",
        "start_on": "2019-09-14",
        "status": "string",
        "time_period": {
            "gid": "12345",
            "resource_type": "time_period",
            "display_name": "Q1 FY22",
            "end_on": "2019-09-14",
            "period": "Q1",
            "start_on": "2019-09-13"
        },
        "followers": [
            {
                "gid": "12345",
                "resource_type": "user",
                "name": "Greg Sanchez"
            }
        ],
        "likes": [
            {
                "gid": "12345",
                "user": {
                    "gid": "12345",
                    "resource_type": "user",
                    "name": "Greg Sanchez"
                }
            }
        ],
        "num_likes": 5,
        "team": {
            "gid": "12345",
            "resource_type": "team",
            "name": "Marketing"
        },
        "workspace": {
            "gid": "12345",
            "resource_type": "workspace",
            "name": "My Company Workspace"
        }
    }
}


class TestAsanaClient(TestCase):
    @responses.activate
    def test_asana_api_error_raised(self):
        responses.add(
            responses.GET,
            f"https://app.asana.com/api/1.0/goals/{test_goal['data']['gid']}",
            status=400
        )
        client = Asana("dummy")
        with self.assertRaises(requests.RequestException):
            client.get_goal(test_goal["data"]["gid"])

    @responses.activate
    def test_asana_get_goal(self):
        responses.add(
            responses.GET,
            f"https://app.asana.com/api/1.0/goals/{test_goal['data']['gid']}",
            status=200,
            json=test_goal,
        )
        client = Asana("dummy")
        goal = client.get_goal(test_goal["data"]["gid"])
        assert isinstance(goal, Goal)

    @responses.activate
    def test_asana_metric_update(self):
        responses.add(
            responses.POST,
            f"https://app.asana.com/api/1.0/goals/{test_goal['data']['gid']}/setMetricCurrentValue",
            status=200,
            json=test_goal,
        )
        client = Asana("dummy")
        client.set_metric_current_value(test_goal["data"]["gid"], 100)
        assert len(responses.calls) == 1
        assert responses.calls[0].request.headers.get("Authorization") == "Bearer dummy"
        assert json.loads(responses.calls[0].request.body)["data"]["current_number_value"] == 100

    def test_asana_semaphore_parsing(self):
        goal_obj = deepcopy(test_goal)
        goal = Goal(goal_obj)

        goal_obj["data"]["status"] = "green"
        assert goal.status == GoalStatus.ON_TRACK

        goal_obj["data"]["status"] = "yellow"
        assert goal.status == GoalStatus.AT_RISK

        goal_obj["data"]["status"] = "red"
        assert goal.status == GoalStatus.OFF_TRACK

    def test_asana_semaphore_assessment(self):
        goal_obj = deepcopy(test_goal)
        goal = Goal(goal_obj)

        goal_obj["data"]["metric"]["current_number_value"] = 20.0
        goal_obj["data"]["metric"]["target_number_value"] = 100.0
        assert goal.assess_status() == GoalStatus.OFF_TRACK

        goal_obj["data"]["metric"]["current_number_value"] = 50.0
        goal_obj["data"]["metric"]["target_number_value"] = 100.0
        assert goal.assess_status() == GoalStatus.AT_RISK

        goal_obj["data"]["metric"]["current_number_value"] = 80.0
        goal_obj["data"]["metric"]["target_number_value"] = 100.0
        assert goal.assess_status() == GoalStatus.ON_TRACK

    @responses.activate
    def test_asana_status_update(self):
        responses.add(
            responses.PUT,
            f"https://app.asana.com/api/1.0/goals/{test_goal['data']['gid']}",
            status=200,
            json=test_goal,
        )
        client = Asana("dummy")
        upd = client.update_goal_status(test_goal["data"]["gid"], GoalStatus.ON_TRACK)
        assert len(responses.calls) == 1
        assert responses.calls[0].request.headers.get("Authorization") == "Bearer dummy"
        assert json.loads(responses.calls[0].request.body)["data"]["status"] == "green"

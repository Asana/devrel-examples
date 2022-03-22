"""
Wrapper code for the Asana API. If Decimal precision is required it is
recommended to add parse_float=Decimal as an argument to the json() calls.
"""
from typing import Union, List

import requests

from asana_goals.util.bearer_auth import HTTPBearerAuth
from asana_goals.util.log_requests import debug_response

from .goal import Goal, GoalStatus

__all__ = ["Asana"]


class Asana:
    def __init__(self, access_token: str) -> None:
        """
        Lightweight Asana API client for the Goal API.
        :param access_token: Asana API access token.
        """
        self._access_token = access_token

    def get_workspaces(self) -> List[dict]:
        """
        Returns the compact records for all workspaces visible to the
        authorized user.
        See: https://developers.asana.com/docs/get-multiple-workspaces
        :return: List of Workspace records.
        """
        resp = requests.get(
            "https://app.asana.com/api/1.0/workspaces",
            auth=HTTPBearerAuth(self._access_token),
        )
        debug_response(__name__, resp)
        resp.raise_for_status()
        return resp.json()["data"]

    def get_time_periods_for_workspace(self, workspace_gid: str) -> List[dict]:
        """
        Returns compact time period records.
        See: https://developers.asana.com/docs/get-time-periods
        :param workspace_gid: Workspace GID to search in.
        :return: List of Time Period records.
        """
        resp = requests.get(
            "https://app.asana.com/api/1.0/time_periods",
            auth=HTTPBearerAuth(self._access_token),
            params={
                "workspace": workspace_gid,
            }
        )
        debug_response(__name__, resp)
        resp.raise_for_status()
        return resp.json()["data"]

    def create_goal(self, goal: Union[Goal, dict]) -> Goal:
        """
        Creates a new goal in a workspace or team.
        See: https://developers.asana.com/docs/create-a-goal
        :param goal: Goal record to be created.
        :return: Created Goal record.
        """
        if isinstance(goal, Goal):
            goal = goal.source
        resp = requests.post(
            "https://app.asana.com/api/1.0/goals/",
            auth=HTTPBearerAuth(self._access_token),
            json=goal
        )
        debug_response(__name__, resp)
        resp.raise_for_status()
        return Goal(resp.json())

    def create_goal_metric(self, goal_gid: str, metric: dict) -> Goal:
        """
        Creates and adds a goal metric to a specified goal.
        See: https://developers.asana.com/docs/create-a-goal-metric
        :param goal_gid: Goal GID to modify.
        :param metric: Metric record to attach.
        :return: Modified Goal record.
        """
        resp = requests.post(
            f"https://app.asana.com/api/1.0/goals/{goal_gid}/setMetric",
            auth=HTTPBearerAuth(self._access_token),
            json={"data": metric}
        )
        debug_response(__name__, resp)
        resp.raise_for_status()
        return Goal(resp.json())

    def add_subgoal(self, parent_goal_gid: str, child_goal_gid: str) -> None:
        """
        Adds a subgoal to a parent goal.
        See: https://developers.asana.com/docs/add-a-subgoal-to-a-parent-goal
        :param parent_goal_gid: Parent Goal GID.
        :param child_goal_gid: Child Goal GID.
        :return:
        """
        resp = requests.post(
            f"https://app.asana.com/api/1.0/goals/{parent_goal_gid}/addSubgoal",
            auth=HTTPBearerAuth(self._access_token),
            json={"data": {"subgoal": child_goal_gid}}
        )
        debug_response(__name__, resp)
        resp.raise_for_status()


    def update_goal_status(self, goal_gid: str, status: GoalStatus) -> Goal:
        """
        Updates the status field for an open Goal using the Asana API.
        See: https://developers.asana.com/docs/update-a-goal
        :param goal_gid: Globally unique identifier for the Goal.
        :param status: Goal status as an enum.
        :return: Goal record.
        """
        resp = requests.put(
            f"https://app.asana.com/api/1.0/goals/{goal_gid}",
            auth=HTTPBearerAuth(self._access_token),
            json={"data": {
                "status": status.value
            }}
        )
        debug_response(__name__, resp)
        resp.raise_for_status()
        return Goal(resp.json())

    def set_metric_current_value(self, goal_gid: str, value: Union[str, int, float]) -> Goal:
        """
        Updates a Goal's existing metric's current_number_value if one exists.
        See: https://developers.asana.com/docs/update-a-goal-metric
        :param goal_gid: Globally unique identifier for the Goal.
        :param value: Value to set on the goal numeric value.
        :return:
        """
        resp = requests.post(
            f"https://app.asana.com/api/1.0/goals/{goal_gid}/setMetricCurrentValue",
            auth=HTTPBearerAuth(self._access_token),
            json={"data": {
                "current_number_value": value
            }}
        )
        debug_response(__name__, resp)
        resp.raise_for_status()
        return Goal(resp.json())


    def get_metric_current_value(self, goal_gid: str) -> Goal:
        """
        Retrieve a Goal's existing metric's current_number_value if one exists.
        :param goal_gid: Globally unique identifier for the Goal.
        :return:
        """
        resp = requests.get(
            f"https://app.asana.com/api/1.0/goals/{goal_gid}",
            auth=HTTPBearerAuth(self._access_token)
        )

        debug_response(__name__, resp)
        resp.raise_for_status()
        return Goal(resp.json())

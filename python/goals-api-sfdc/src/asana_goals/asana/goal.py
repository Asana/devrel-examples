"""
Goal resource wrapper.
"""
from enum import Enum

__all__ = ["Goal", "GoalStatus"]


class GoalStatus(Enum):
    """
    Represents the current status of a Goal.
    """
    ON_TRACK = "green"
    AT_RISK = "yellow"
    OFF_TRACK = "red"


class Goal:
    """
    Wraps a Goal resource from Asana.
    """
    source: dict

    def __init__(self, source: dict):
        """
        Initialize goal wrapper with a Goal object fetched from the API.
        :param source: API response.
        """
        self.source = source
        
    @property
    def gid(self):
        """
        Returns the globally unique identifier for the Goal.
        :return:
        """
        return self.source["data"]["gid"]

    @property
    def status(self) -> GoalStatus:
        """
        Returns the Goal status field as an enumerated value.
        :return:
        """
        status = self.source["data"]["status"]
        if status == GoalStatus.ON_TRACK.value:
            return GoalStatus.ON_TRACK
        elif status == GoalStatus.AT_RISK.value:
            return GoalStatus.AT_RISK
        elif status == GoalStatus.OFF_TRACK.value:
            return GoalStatus.OFF_TRACK

    @property
    def current_value(self) -> float:
        """
        Returns the current number value for this Goal.
        :return:
        """
        return self.source["data"]["metric"]["current_number_value"]

    @property
    def target_value(self) -> float:
        """
        Returns the target number value for this Goal.
        :return:
        """
        return self.source["data"]["metric"]["target_number_value"]

    def assess_status(self) -> GoalStatus:
        """
        Automatically determines the would-be status of this Goal based on its
        percentage completion. The current thresholds are:
        On Track  - 66% or more of the goal metric
        At Risk   - between 33% and 66% of the goal metric
        Off Track - less than 33% of the goal metric

        Naturally, if a different criteria is desired this is the function to
        edit.
        :return: Assessed status.
        """
        pct = self.current_value / self.target_value
        if pct < 0.33:
            return GoalStatus.OFF_TRACK
        elif 0.33 <= pct < 0.66:
            return GoalStatus.AT_RISK
        else:
            return GoalStatus.ON_TRACK

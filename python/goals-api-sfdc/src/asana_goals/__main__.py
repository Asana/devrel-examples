import logging
import logging.config
from time import time, sleep
from argparse import ArgumentParser
from decimal import Decimal
from typing import Optional, Union, Dict

import toml
from croniter import croniter

from asana_goals.asana import Asana
from asana_goals.asana.goal import Goal
from asana_goals.data_source.salesforce import Salesforce
from asana_goals.initializer import InitializerProcess

AnyNumber = Union[str, int, float, Decimal]


class MainProcess:
    """
    Encloses the runtime variables for an instance of this application.
    """
    # List of goals we just synced
    synced: Dict[str, Goal]
    # Indicates if we are running standalone or as a service
    service: bool
    # These only get used when running as a service
    cron: Optional[croniter]
    shutdown: Optional[bool]

    # These values are loaded from the config file
    app: dict
    sf: Salesforce
    asana: Asana
    goals: dict

    def __init__(self, config_filename: str, service: bool = False) -> None:
        """
        Initialize process instance.
        :param config_filename: Application config to read.
        :param service: If True, this package will poll based on a given cron
                        string.
        """
        self.synced = {}
        self.service = service
        self.cron = None
        self.shutdown = None
        with open(config_filename) as f:
            cfg = toml.loads(f.read())
            if cfg.get("logging") is not None:
                logging.config.dictConfig(cfg["logging"])
            else:
                logging.basicConfig()
            logging.getLogger(__name__).info("Config file loaded")

        self.app = cfg["app"]
        self.sf = Salesforce(**cfg["salesforce"])
        self.asana = Asana(**cfg["asana"])
        self.goals = cfg["goals"]

    def loop(self) -> None:
        """
        Main loop iteration
        """
        # Reset synced dict
        self.synced = {}
        # Sync each goal
        for goal in self.app["goals"]:
            self.sync_goal(goal)

    def sync_goal(self, goal: str) -> Goal:
        """
        Synchronize a goal between systems. This fetches the goal updated value
        from a data source and uploads the new value to Asana.
        :param goal: Goal config key.
        :return:
        """
        # Handle a double sync
        if goal in self.synced:
            return self.synced[goal]
        # Handle the case where the goal is not configured
        try:
            goal_obj = self.goals[goal]
        except KeyError:
            goal_obj = None
            logging.getLogger(__name__).error(
                "Configuration error: Referenced goal '%s' does not exist.",
                goal,
            )
            exit(-1)
        # Update the goal value
        value = self.get_value(goal_obj)

        if goal_obj["source"] != "asana":
            upd = self.asana.set_metric_current_value(goal_obj["goal_id"], value)
            logging.getLogger(__name__).info(
                "Updating goal '%s' value to '%s'",
                goal, value,
            )
        else:
            upd = self.asana.get_metric_current_value(goal_obj["goal_id"])

        upd = self.asana.update_goal_status(goal_obj["goal_id"], upd.assess_status())
        # Remember we just synced this Goal
        self.synced[goal] = upd
        return upd


    def get_value(self, goal_obj: dict) -> AnyNumber:
        """
        Gets a the new value for the given goal dict using a handler function
        depending on said goal's source.
        :param goal_obj: Configured goal
        :return:
        """
        source = goal_obj["source"]
        # Get a handler function depending on where this goal is coming from
        f = getattr(self, "get_value_" + source)
        if f is None:
            raise KeyError(f"Source {source} not managed.")
        # Use the handle function to get the updated value
        return f(goal_obj)

    def get_value_composite(self, goal_obj: dict) -> AnyNumber:
        """
        Gets a new value calculated from multiple subgoals.
        """
        subsum = 0
        for subgoal, weight in zip(goal_obj["subgoals"], goal_obj["weights"]):
            sg = self.sync_goal(subgoal)
            subsum += (sg.current_value / sg.target_value) * weight
        return subsum

    def get_value_fixed(self, goal_obj: dict) -> AnyNumber:
        """
        Gets a fixed value from config.
        """
        return goal_obj["value"]
 
    def get_value_salesforce_report(self, goal_obj: dict) -> AnyNumber:
        """
        Gets a new value from a Salesforce report aggregate.
        """
        rpt = self.sf.get_report(goal_obj["sf_report_id"])
        return rpt.get_metric(goal_obj["sf_metric"])

    def get_value_asana(self, goal_obj: dict) -> AnyNumber:
        """
        Gets latest value from Asana goals.
        """
        rpt = self.asana.get_metric_current_value(goal_obj["goal_id"])
        return 1.1


    def main(self) -> int:
        """
        Main function. Return exit status code.
        """
        if self.service:
            self.shutdown = False
            self.cron = croniter(self.app["cron_string"])
            next_run = self.cron.get_next()
            while not self.shutdown:
                if time() > next_run:
                    self.loop()
                    next_run = self.cron.get_next()
                sleep(5)
        else:
            self.loop()
        return 0


def setup_argument_parser(parser: ArgumentParser):
    parser.add_argument(
        "config_file",
        nargs="?",
        help="set a different config file instead of config.toml in current working directory",
        default="./config.toml"
    )
    parser.add_argument(
        "-s", "--service",
        help="runs this program as a background service",
        action="store_true"
    )
    parser.add_argument(
        "-i", "--initialize",
        help="using the provided access token, helps to generate goal entries "
             "in Asana and a config file referencing them",
        metavar="ACCESS_TOKEN"
    )
    parser.add_argument(
        "-w", "--workspace",
        help="workspace for the initializer",
        metavar="WORKSPACE_GID",
    )
    parser.add_argument(
        "-t", "--time_period",
        help="time period for the initializer",
        metavar="TIME_PERIOD_GID",
    )


def main():
    parser = ArgumentParser()
    setup_argument_parser(parser)
    args = parser.parse_args()

    if args.initialize:
        process = InitializerProcess(
            args.config_file, args.initialize, args.workspace, args.time_period
        )
    else:
        process = MainProcess(args.config_file, args.service)

    status = process.main()
    logging.getLogger(__name__).info("Process finished, shutting down.")
    exit(status)


if __name__ == "__main__":
    main()

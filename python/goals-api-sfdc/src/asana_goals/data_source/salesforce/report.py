__all__ = ["SalesforceReport"]


class SalesforceReport:
    source: dict

    def __init__(self, source: dict) -> None:
        """
        Wrapper object over a Salesforce report REST representation.
        :param source:
        """
        self.source = source

    def get_metric(self, metric: str) -> str:
        """
        Gets a named aggregate from this Report. The format is complicated so
        zipping labels is required.
        :param metric: Metric name to fetch.
        :return: Value obtained from said metric.
        """
        api_names = self.source["reportMetadata"]["aggregates"]
        values = self.source["factMap"]["T!T"]["aggregates"]

        for api_name, val in zip(api_names, values):
            if api_name == metric:
                return val["value"]

        raise KeyError(f"Metric {metric} not found")

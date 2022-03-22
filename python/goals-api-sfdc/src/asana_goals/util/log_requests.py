from logging import getLogger
from requests import Response

__all__ = ["debug_response"]


def debug_response(module_name: str, resp: Response) -> None:
    getLogger(module_name).debug(
        "Received response [%s]: %s", resp.status_code, resp.text
    )

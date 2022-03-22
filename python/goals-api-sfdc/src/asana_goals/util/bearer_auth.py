from requests.auth import AuthBase

__all__ = ["HTTPBearerAuth"]


class HTTPBearerAuth(AuthBase):
    """
    Attaches HTTP Bearer Authentication to the given Requests Request object.
    """

    def __init__(self, access_token: str):
        self._access_token = access_token

    def __call__(self, r):
        r.headers["Authorization"] = "Bearer " + self._access_token
        return r

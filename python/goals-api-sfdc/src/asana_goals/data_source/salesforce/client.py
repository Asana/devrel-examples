import base64
import json
from datetime import datetime, timedelta
from typing import Tuple

import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key

from asana_goals.util.bearer_auth import HTTPBearerAuth
from asana_goals.util.log_requests import debug_response

from .report import SalesforceReport

__all__ = ["Salesforce"]

LOGIN_BASE_URL = "https://login.salesforce.com"
REPORT_URL = "/services/data/v52.0/analytics/reports/{report_id}"


class Salesforce:
    def __init__(self, username: str, client_id: str, private_key_file: str) -> None:
        """
        Wrapper over the Salesforce REST API.
        :param username: Target user username.
        :param client_id: Application client ID.
        :param private_key_file: PEM format private key filename.
        """
        self._username = username
        self._client_id = client_id
        with open(private_key_file, "rb") as f:
            payload = f.read()
            self._pk = load_pem_private_key(payload, None)

    def _authenticate(self) -> Tuple[str, HTTPBearerAuth]:
        """
        Performs authentication through JWT bearer token with the Salesforce
        REST API. Required to obtain an access token for subsequent requests.
        :return: Instance URL and access token.
        """
        resp = requests.post(LOGIN_BASE_URL + "/services/oauth2/token", data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": self._make_salesforce_jwt(),
        })
        debug_response(__name__, resp)
        resp.raise_for_status()
        j = resp.json()
        return j["instance_url"], HTTPBearerAuth(j["access_token"])

    def _make_salesforce_jwt(self) -> bytes:
        """
        Private function to generate a JWT in the format required by Salesforce.
        :return: JWT bytes.
        """
        # Salesforce requires specific formatting for the JWT
        # See: https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_jwt_flow.htm&type=5
        header = {"alg": "RS256"}
        jcs = {
            "iss": self._client_id,
            "sub": self._username,
            "aud": LOGIN_BASE_URL,
            "exp": int((datetime.utcnow() + timedelta(minutes=2)).timestamp()),
        }

        header_b64 = base64.urlsafe_b64encode(
            json.dumps(header, separators=(",", ":")).encode("utf-8")
        )
        jcs_b64 = base64.urlsafe_b64encode(
            json.dumps(jcs, separators=(",", ":")).encode("utf-8")
        )

        payload = header_b64 + b"." + jcs_b64

        digest = self._pk.sign(payload, padding.PKCS1v15(), hashes.SHA256())
        digest_b64 = base64.urlsafe_b64encode(digest)

        return payload + b"." + digest_b64

    def get_report(self, report_id: str) -> SalesforceReport:
        """
        Gets a Salesforce Report resource through the REST API.
        :param report_id: Report ID to fetch.
        :return: Salesforce Report resource.
        """
        url, auth = self._authenticate()
        resp = requests.get(
            url + REPORT_URL.format(report_id=report_id),
            auth=auth,
        )
        debug_response(__name__, resp)
        resp.raise_for_status()
        return SalesforceReport(resp.json())

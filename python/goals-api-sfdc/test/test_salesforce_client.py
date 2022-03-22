from unittest import TestCase
from unittest.mock import patch, mock_open

import requests
import responses

from asana_goals.data_source.salesforce import Salesforce

test_report = {
    "attributes": {
        "describeUrl": "/services/data/v52.0/analytics/reports/111111111111111111/describe",
        "instancesUrl": "/services/data/v52.0/analytics/reports/111111111111111111/instances",
        "reportId": "111111111111111111",
        "reportName": "Won Opportunities",
        "type": "Report"
    },
    "allData": True,
    "factMap": {
        "T!T": {
            "aggregates": [{
                "label": "USD 3,745,000.00",
                "value": 3745000.0
            }, {
                "label": "100%",
                "value": 100.0
            }, {
                "label": "19",
                "value": 19
            }],
            "rows": []
        }
    },
    "groupingsAcross": {
        "groupings": []
    },
    "groupingsDown": {
        "groupings": []
    },
    "hasDetailRows": True,
    "picklistColors": {},
    "reportExtendedMetadata": {
        "aggregateColumnInfo": {
            "s!AMOUNT": {
                "dataType": "currency",
                "label": "Sum of Amount"
            },
            "RowCount": {
                "dataType": "int",
                "label": "Record Count"
            },
            "a!PROBABILITY": {
                "dataType": "percent",
                "label": "Average Probability (%)"
            }
        }
    },
    "reportMetadata": {
        "aggregates": ["s!AMOUNT", "a!PROBABILITY", "RowCount"],
        "currency": "USD",
    }
}
test_private_key = b"""
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAunF+nEC81/A/MvP0SDvAVk7h7s/FlMxhwBNWdv+tLycZPoua
1TQmPPld207RJkowI4iGi72Leq0JSvNgJfDFe1vlWt5xQYG61aA4WBJvzTx02mU5
NDamuB7tJj73oeOtvlWv5Abju8nmBrVmORF0+09XGvhCC5XtvTJJSS46VdkqNbB3
9gpykv7pdY6OCaQjF+1wuCeOfgtUu1ZsZAFAtw22aWGy3AEhAlcXt1PXHgox06MX
QzPqtpj9Zlr0HqwAGvsxmeDUlDgvletVdnbmLewNtJphwh59Kvcw/5L8N3t97yHt
lNDoez0HMtQzSWMZKP/gYCLrR6nxo3EMMQJi3QIDAQABAoIBAQCae/YbxGx1RKUp
NAiiXZgmK6B7f39Ipv0L6ToIyhuW6X+6WnTF2jsg5MMHN8yHPIuctcA+Q6Ux1fTQ
PM7bQSBw8ZkebRhM3hCQd/yXxVcMKN7uI1d90xbbkwyPVzda1cud3WQrviWu8UD/
KAl2medjYL9dIn2fGfDuhp9A2uQNQsTSNq0cZXPmrK8tGOW3EH/ThgkPCojpbr0R
sLXSwV3KkppchVqv0Z5/OIM56Ljs+NAhykMOyQXMFqcSIquxBf7MPrwCzHd9wwyU
RGndG5w/1VwvDw7J6VK1PVeBcv02A8p8arPF9QrEBixYFuhRFHRt1DaaD0awv9vc
TUtwHsIlAoGBAOAzOcCsdpaoSJ8RTK1OgVfpuG6m4vYKF7bNS7IqCaZwxz09fjl+
Nf9NyhCv06sGVc+xJfG0oXLKDfklSJlLnCJFpUNS7O++VVoeN+Tq3DNM9y57ITsX
lXLxDbobZC4F/+OemQIG3AB5TWyJHODVnZf1+w6PI7wzlIxdLiR4GjOnAoGBANTj
TzMDeTP73ovuQiNVq1WJCulUyukYgDQ8+p76+VbyAWn9qCmjNIl1RV0LUcoEmoLG
C2V34vi7YpE4yjex7T2tq/5dUKaetR4n3Bq+Ka09BNzdiezZqxHJCGaZiNJYuEct
WLTKTOjBvxoQu0aEBdG/DIyLGUAYzzYLxAaqOJXbAoGAASnC3vEGHHn7Bng8gZmq
qh4YStqqysP6o4QlJGN7cVWccwDiqsGw3gY1SijfXD/IKi+tFrftLn9F20kKO2Fd
CgB6fwLrH8NJBhKqD5H4WnvHvIH/BiN1Lwd5HsINnv+A+FlWSeBnO8llUW7Uq4Xw
L12jU8wCT3OlDaVeG+pTmHkCgYAw8kJXXEkVpqc4TQNv1FacR/H2S8SLa1KusAZ/
XvzM/L9Oez+asyd1Iz1bcyrO49gSkS41mibZQVwcP45e183QDIoq5ZGRfZPu5wM4
MtiqOAlSLq1zg2hNoocH7+0BT9yuoMJwbsLYERO7DnXAdMJRwzdDaQfZMNsTdgkP
7zsrWQKBgQDGL85jg9e4yvXLuHnQSINXA3Fi4kFwtgYEfofVzYZm/FbcBAlrAvO3
pUP16GwGS29BG3bYD/QJH0PIK1tAmfkCt5XyeojGWxeolSqlEO3K+LRoxv2tWlx1
JCSm42+1Kf285/oaxGZgxyxrK97L2spdr1ooE6p6vESRE5YDXE8pAw==
-----END RSA PRIVATE KEY-----
"""


class TestSalesforceClient(TestCase):
    @responses.activate
    @patch("builtins.open", new_callable=mock_open, read_data=test_private_key)
    def test_auth_failure_raises(self, file_mock):
        responses.add(
            responses.POST,
            f"https://login.salesforce.com/services/oauth2/token",
            status=401
        )
        client = Salesforce("dummy", "dummy", "salesforce_pk")
        assert file_mock.called
        with self.assertRaises(requests.RequestException):
            client.get_report(test_report["attributes"]["reportId"])

    @responses.activate
    @patch("builtins.open", new_callable=mock_open, read_data=test_private_key)
    def test_get_report_metric(self, file_mock):
        responses.add(
            responses.POST,
            f"https://login.salesforce.com/services/oauth2/token",
            status=200,
            json={
                "instance_url": "https://instance.salesforce.com",
                "access_token": "token"
            }
        )
        responses.add(
            responses.GET,
            (
                f"https://instance.salesforce.com/services/data/v52.0/analytics/reports/" +
                test_report["attributes"]["reportId"]
            ),
            status=200,
            json=test_report
        )
        client = Salesforce("dummy", "dummy", "salesforce_pk")
        assert file_mock.called
        rpt = client.get_report(test_report["attributes"]["reportId"])
        assert len(responses.calls) == 2
        assert rpt.get_metric("s!AMOUNT") == 3745000.0
        with self.assertRaises(KeyError):
            rpt.get_metric("None")

import json
import asyncio
import aiohttp


async def asana_client(method, url, session, **kwargs):
    backoff_seconds = 0.500
    retryError = 429
    attempt = 0

    base_url = "https://app.asana.com/api/1.0"
    full_url = base_url + url

    if "data" in kwargs:
        data = json.dumps(kwargs["data"])
    else:
        data = {}

    if "params" in kwargs:
        params = kwargs["params"]
    else:
        params = {}

    headers = {"Authorization": "Bearer " + kwargs["token"]}

    result = False

    while ((retryError == 429) or (retryError == 500)) and (attempt < 10):
        # pause execution before trying again

        if attempt == 6:
            print("hitting rate limits. slowing down calls...")

        if attempt == 8:
            print("thanks for your patience. still slow.")

        try:
            response = await session.request(
                method,
                url=full_url,
                data=data,
                params=params,
                headers=headers,
                raise_for_status=False,
            )
            retryError = response.status

            if retryError >= 400:
                if (response.status != 429) and (response.status != 500):
                    error_json = await response.json()
                    print(error_json["errors"][0]["message"])
                    print("HTTP Error: ", response.status)
                    return False
            else:
                result = await response.json()
                return result

        except aiohttp.client_exceptions.ClientResponseError as e:
            if (response.status != 429) and (response.status != 500):
                print("HTTP Error: ", response.status)
                error_json = await response.json()
                print(error_json["errors"][0]["message"])
                return False

        # Exponential backoff in seconds = constant * attempt^2
        retry_time = backoff_seconds * attempt * attempt

        print(
            f"The script is hitting rate limits (too many calls/minute). Waiting for {retry_time} seconds before continuing"
        )
        await asyncio.sleep(retry_time)
        attempt += 1

    if attempt >= 10:
        print("too many requests hit rate limits - timed out")

    return result

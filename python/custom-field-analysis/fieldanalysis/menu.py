import sys
import csv
from .asanaUtils.client import asana_client

async def menu(session):
    # Get access token
    token = input("Enter your personal access token: ")

    # Test the token to ensure it works
    user = await asana_client(
        **{"method": "GET", "url": "/users/me", "session": session, "token": token}
    )
    if not user:
        sys.exit("invalid account token")

    print("\nYou are a member of these workspaces:")
    for space in user["data"]["workspaces"]:
        print(f"{space['name']} - GID: {space['gid']}")

    # Get link to portfolio and split it to get the global ID
    workspace_gid = input("Input the workspace GID you want to analyze: ")

    # Try getting the workspace from Asana to make sure it exists and we can access it
    workspace = await asana_client(
        **{
            "method": "GET",
            "url": f"/workspaces/{workspace_gid}",
            "session": session,
            "token": token,
        }
    )

    if not workspace:
        sys.exit(
            "could not get workspace or it does not exist. check that you have access to it"
        )

    include_projects = input(
        "Would you also like to count the projects that use the custom field? This can take several minutes longer, depending on your workspace size? (y/N)"
    )

    if include_projects in ["Y", "y", "yes", "Yes"]:
        projects_flag = True
    else:
        projects_flag = False

    print("Working...")

    return [
        workspace_gid,
        workspace["data"]["name"],
        projects_flag,
        token,
    ]

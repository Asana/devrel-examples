__version__ = "0.1"

import enum
from operator import truediv
import os
import asyncio
import aiohttp
import sys
from .menu import menu

from .asanaUtils.client import asana_client
import csv

##################################################
# Main Function (orchestrates all functionality) #
##################################################


#  An asynchronous function to get all custom fields in Asana
async def get_fields():

    # Create the client session with aiohttp
    # This library allows us to send multiple API requests at once in conjunction with asyncio
    async with aiohttp.ClientSession() as session:

        [
            workspace,
            workspace_name,
            projects_flag,
            token,
        ] = await menu(session)

        has_more = True
        limit = 100
        offset = ""
        # For more information on this API endpoint, see: https://developers.asana.com/reference/getcustomfieldsforworkspace
        # Note that this request uses also input/output options: https://developers.asana.com/docs/inputoutput-options
        url = f"/workspaces/{workspace}/custom_fields?limit={limit}&opt_fields=gid,name,type,created_by.(name|email),enum_options"

        custom_fields = {}

        # Fetch custom fields, iterating through all pages in the response.
        # For more information on Pagination, see: https://developers.asana.com/docs/pagination
        while has_more == True:

            if offset != "":
                url = f"/workspaces/{workspace}/custom_fields?limit={limit}&opt_fields=gid,name,type,created_by.(name|email),enum_options&offset={offset}"

            result = await asana_client(
                **{
                    "method": "GET",
                    "url": url,
                    "session": session,
                    "token": token,
                }
            )

            for cf in result["data"]:
                custom_fields[cf["gid"]] = flatten_custom_field_values(cf)
                custom_fields[cf["gid"]]["project_count"] = 0

            if "next_page" in result:
                if result["next_page"] != None:
                    offset = result["next_page"]["offset"]
                else:
                    has_more = False
            else:
                has_more = False

        headers = [
            "gid",
            "name",
            "type",
            "created_by_name",
            "created_by_email",
            "is_global_to_workspace",
            "enum_option_names",
        ]

        # if the user has indicated they would also like to see project counts, get all the projects:
        if projects_flag:

            # Get all projects in the workspace, along with their custom fields
            has_more = True
            limit = 100
            offset = ""
            url = f"/workspaces/{workspace}/projects?limit={limit}&opt_fields=custom_field_settings.custom_field.gid"

            # Total count of projects with custom fields
            total_count = 0

            while has_more == True:

                if offset != "":
                    # For more information on this API endpoint, see: https://developers.asana.com/reference/getprojectsforworkspace
                    url = f"/workspaces/{workspace}/projects?limit={limit}&opt_fields=custom_field_settings.custom_field.gid&offset={offset}"

                result = await asana_client(
                    **{
                        "method": "GET",
                        "url": url,
                        "session": session,
                        "token": token,
                    }
                )

                projects = result["data"]

                # Again, paginate requests. For more information, see: https://developers.asana.com/docs/pagination
                if "next_page" in result:
                    if result["next_page"] != None:
                        offset = result["next_page"]["offset"]
                    else:
                        has_more = False
                else:
                    has_more = False

                # Add a +1 project count to each custom field referenced in each project
                for project in projects:
                    total_count += 1
                    for customFieldSetting in project["custom_field_settings"]:
                        if customFieldSetting["custom_field"]["gid"] in custom_fields:
                            custom_fields[customFieldSetting["custom_field"]["gid"]][
                                "project_count"
                            ] += 1

                print(f"Analyzing {total_count} projects...")

                headers = [
                    "gid",
                    "project_count",
                    "name",
                    "type",
                    "created_by_name",
                    "created_by_email",
                    "enum_option_names",
                ]

        file_name = f"{workspace_name}_Asana_Custom_Field_Audit_Sheet.csv"

        print(
            f"Done! See the resulting CSV file in your current directory: {file_name}"
        )

        # write to a CSV:
        with open(file_name, "w") as csvfile:
            writer = csv.DictWriter(
                csvfile, fieldnames=headers, restval="", extrasaction="ignore"
            )
            writer.writeheader()
            writer.writerows(list(custom_fields.values()))

    return


##############################################
# Utils                                      #
##############################################

# Main function which is targeted by the CLI command
def main():
    # Runs the project upload function asynchronously

    try:
        asyncio.run(get_fields())
    except KeyboardInterrupt:
        print("\nInterrupted - goodbye")
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)


# If this file is run directly via Python:
if __name__ == "__main__":
    try:
        asyncio.run(get_fields())
    except KeyboardInterrupt:
        print("\nInterrupted - goodbye")
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)

# Formats custom field values
def flatten_custom_field_values(custom_field):

    if "enum_options" in custom_field:
        new_enum_options = []
        custom_field["enum_options"] = list(custom_field["enum_options"])

        for value in custom_field["enum_options"]:
            new_enum_options.append(dict(value)["name"])

        custom_field["enum_option_names"] = new_enum_options

    if "created_by" in custom_field and custom_field["created_by"] != None:
        custom_field["created_by"] = dict(custom_field["created_by"])
        custom_field["created_by_email"] = custom_field["created_by"]["email"]
        custom_field["created_by_name"] = custom_field["created_by"]["name"]

    return custom_field

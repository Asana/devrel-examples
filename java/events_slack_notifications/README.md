# Overview

This project is an example of a use case of Asana Events. This app uses Asana Events to send a celebratory message to a Slack channel whenever a milestone is completed for a given project.

Installation
------------

This project uses [Maven](http://maven.apache.org/) to manage its dependencies. There are 2 dependencies added to the `pom.xml` file:

Asana

    <dependency>
         <groupId>com.asana</groupId>
         <artifactId>asana</artifactId>
         <version>0.9.0</version>
    </dependency>

Slack
	
	<dependency>
      <groupId>com.hubspot.slack</groupId>
      <artifactId>slack-java-client</artifactId>
      <version>1.3</version>
    </dependency>

You can build these artifacts and install them to your local Maven repository:

	mvn install

Compilation
-----------

    mvn compile


Run
---

Before running, be sure to run `mvn compile` first.
In addition, set your global ASANA_ACCESS_TOKEN and SLACK_TOKEN environment variables.

	export ASANA_ACCESS_TOKEN="X"
	export SLACK_TOKEN="X"

 Configure the `CHANNEL_ID` variable in `src/main/java/com/my_asana/app/MilestoneCelebratorySlackMessage` to the slack channel to send notifications to.

 To run:

 	mvn exec:java -Dexec.mainClass="com.my_asana.app.MilestoneCelebratorySlackMessage" -Dexec.args=[PROJECT_GID]

The first time you run this script, it will save a sync token in a file `asana_sync_token_for_project_[PROJECT_GID]` for future use. Then, on subsequent runs, it will refer to this sync token to gather new events.
# What is GSM?

The GEOINT Solutions Marketplace (GSM), is an open and inclusive online exchange that enables the community of users and solution providers to connect, collaborate and enhance the GEOINT mission.
GSM is a repository for information about the GEOINT mission, vision and strategy, user’s needs and challenges, solutions, industry capabilities and trends and R&D. Additionally, it is an interactive environment to gather new ideas, increase transparency, and collaborate on new technologies.

## Steps to run GSM in docker

## Initialize docker containers ##

The script accepts 2 arguments:

	1. Host port that will be mapped to the node container.  Defaults to 3000.
	2. Host port that will be mapped to the mongo container  Defaults to 27017.	

The script does the following things:

	1. creates a user-defined network named 'gsm_isolated'
 	2. builds the 'gsm-mongo' image
 	3. runs a container named 'gsm-mongoDB' on the gsm_isolated network mapped to the provided mongo port.  Maps to 27017 if no arguments supplied.
 	4. builds the 'gsm-node' image
 	5. Creates default accounts, organizations, and communities.
 	6. runs a container named 'gsm-nodeWeb' on the gsm_isolated network mapped to the provided node port.  Maps to 3000 if no argument supplied.
	7. Stops both containers

To run the script:
	
	from the root of the repo run `sh initDocker.sh 3000 27017` 	

## Start docker containers ##

from the root of the repo run `sh start.sh`

in a browser navigate to `http://localhost:3000`

login with the default user
> **username**: testuser@testuser.com 
> **password**: ChangeMe

The mongo database can be accessed at `localhost:27017`

## Stop running docker containers ##

from the root of the repo run `sh stop.sh`

## To cleanup local containers and images ##

from the root of the repo run `sh cleanupDocker.sh`

## To add npm packages ##

To add new npm packages stop and start the node container

from the root of the repo `sh stop.sh`
from the root of the repo `sh start.sh`

## Exporting a database ##

To export a database:

from localhost (using port 27170) run `sh export.sh`
from an external url run `sh export.sh <url:port>`

The export script will run a mongo dump to the db directory jiv/db/

## Importing a database ##

To import a database: 

from jiv/db/ directory run `sh import.sh`
from a different directory run `sh import.sh /path/to/db/dir`

The import script runs a mongo restore command looking for the output
of the mongodump

## Want to customize your GSM

[local install and customization](https://github.com/stlviper/gsm/blob/master/jiv/README.md)


#!/bin/bash

if [ -z $1 ]
    then
        echo "No node port supplied. Setting node port to 3000"
        NODE_PORT=3000
else
    if [ $1 -gt 0 ]
        then
            echo 'Setting Node Port to ' $1
            NODE_PORT=$1
        else
            echo 'Improper format supplied for node port exiting script'
            exit
    fi
fi

if [ -z $2 ]
    then
        echo "No mongo port supplied. Setting mongo port to 27017"
        MONGO_PORT=27017
else
    if [ $2 -gt 0 ]
        then
            echo 'Setting Mongo Port to ' $2
            MONGO_PORT=$2
        else
            echo 'Improper format supplied for mongo port exiting script'
            exit
    fi
fi

docker network create --driver bridge gsm_isolated

docker build -t gsm-mongo ./gsm-mongo

docker run -d --name "gsm-mongoDB" -p $MONGO_PORT:27017 --network gsm_isolated -v $(pwd)/jiv/config:/usr/src/app/jiv/config gsm-mongo

docker build -t gsm-node .

docker exec -d gsm-mongoDB mongoimport --db gsm --collection accounts  --type json --file /usr/src/app/jiv/config/default_user.json

docker exec -d gsm-mongoDB mongoimport --db gsm --collection communities  --type json --file /usr/src/app/jiv/config/default_community.json

docker exec -d gsm-mongoDB mongoimport --db gsm --collection organizations  --type json --file /usr/src/app/jiv/config/default_organization.json

docker run -d --name "gsm-nodeWeb" -p $NODE_PORT:3001 --network gsm_isolated -v $(pwd)/jiv:/usr/src/app/jiv gsm-node

docker stop gsm-nodeWeb

docker stop gsm-mongoDB

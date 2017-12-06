#!/bin/bash

docker stop gsm-nodeWeb
docker stop gsm-mongoDB

docker rm gsm-nodeWeb
docker rm gsm-mongoDB

docker rmi gsm-node
docker rmi gsm-mongo

docker network rm gsm_isolated
#!/bin/bash

current_time=$(date "+%Y.%m.%d-%H.%M.%S")
location=/home/ec2-user/db-bkps

# DEVELOPMENT
bkp_name=jivango-development-bkp
/usr/bin/mongodump --db jivango-development --out $location/$current_time-$bkp_name
/usr/bin/tar -czvf $location/$current_time-$bkp_name.tar -C $location $current_time-$bkp_name
/usr/bin/aws s3 cp $location/$current_time-$bkp_name.tar s3://jivango-private/development/db-bkps/$current_time-$bkp_name.tar

bkp_name=jivangoChat-development-bkp
/usr/bin/mongodump --db jivangoChat-development --out $location/$current_time-$bkp_name
/usr/bin/tar -czvf $location/$current_time-$bkp_name.tar -C $location $current_time-$bkp_name
/usr/bin/aws s3 cp $location/$current_time-$bkp_name.tar s3://jivango-private/development/db-bkps/$current_time-$bkp_name.tar

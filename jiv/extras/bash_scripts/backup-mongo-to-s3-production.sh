#!/bin/bash

current_time=$(date "+%Y.%m.%d-%H.%M.%S")
location=/home/ec2-user/db-bkps

#PRODUCTION
bkp_name=jivango-bkp
/usr/bin/mongodump --db jivango --out $location/$current_time-$bkp_name
/usr/bin/tar -czvf $location/$current_time-$bkp_name.tar -C $location $current_time-$bkp_name
/usr/bin/aws s3 cp $location/$current_time-$bkp_name.tar s3://jivango-private/production/db-bkps/$current_time-$bkp_name.tar

#bkp_name=jivangoChat-bkp
#/usr/bin/mongodump --db jivangoChat --out $location/$current_time-$bkp_name
#/usr/bin/tar -czvf $location/$current_time-$bkp_name.tar -C $location $current_time-$bkp_name
#/usr/bin/aws s3 cp $location/$current_time-$bkp_name.tar s3://jivango-private/production/db-bkps/$current_time-$bkp_name.tar

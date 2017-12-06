#!/bin/bash

current_time=$(date "+%Y.%m.%d-%H.%M.%S")
location=/home/ec2-user/db-bkps

# DEMO
bkp_name=jivango-demo-bkp
/usr/bin/mongodump --db jivango-demo --out $location/$current_time-$bkp_name
/usr/bin/tar -czvf $location/$current_time-$bkp_name.tar -C $location $current_time-$bkp_name
/usr/bin/aws s3 cp $location/$current_time-$bkp_name.tar s3://jivango-private/demo/db-bkps/$current_time-$bkp_name.tar

bkp_name=jivangoChat-demo-bkp
/usr/bin/mongodump --db jivangoChat-demo --out $location/$current_time-$bkp_name
/usr/bin/tar -czvf $location/$current_time-$bkp_name.tar -C $location $current_time-$bkp_name
/usr/bin/aws s3 cp $location/$current_time-$bkp_name.tar s3://jivango-private/demo/db-bkps/$current_time-$bkp_name.tar

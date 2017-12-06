echo $1

if [ -z $1 ]
then
	mongodump --out jiv/db/
else
	mongodump --host $1 --out jiv/db/
fi

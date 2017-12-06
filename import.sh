echo $1

if [ -z $1 ]
then
	mongorestore --db gsm jiv/db/gsm
else
	mongorestore --db gsm $1
fi

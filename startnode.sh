#!/bin/bash

cd /usr/src/app/jiv

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm use system

npm install

nvm use default

NODE_ENV=docker pm2-docker start ./bin/www --watch
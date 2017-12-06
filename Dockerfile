# escape=`
FROM node:8.2.1

WORKDIR /usr/src/app
RUN mkdir jiv && mkdir logs
ADD startnode.sh .
RUN ["chmod", "+x", "/usr/src/app/startnode.sh"]

#add user node and use it to install node/npm and run the app
RUN useradd --home /home/gsmnode -m -U -s /bin/bash gsmnode

#allow some limited sudo commands for user `gsmnode`
RUN echo 'Defaults !requiretty' >> /etc/sudoers; `
    echo 'gsmnode ALL= NOPASSWD: /usr/sbin/dpkg-reconfigure -f noninteractive tzdata, /usr/bin/tee /etc/timezone, /bin/chown -R gsmnode\:gsmnode /usr/src/app' >> /etc/sudoers;

RUN chown -R gsmnode:gsmnode /usr/src/app

#run all of the following commands as user node from now on
USER gsmnode

COPY ./jiv/package.json jiv/

# Install NVM
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash

# node version required to run GSM
#ENV NODE_VERSION 0.12.7
ENV NODE_VERSION v4.2.0
#needed by nvm install
ENV NVM_DIR /home/gsmnode/.nvm

WORKDIR /usr/src/app/jiv

RUN . ~/.nvm/nvm.sh && nvm install $NODE_VERSION && nvm alias default $NODE_VERSION && nvm use default && npm install pm2 -g && npm install

VOLUME /usr/src/app/jiv

EXPOSE 3001

CMD ["/usr/src/app/startnode.sh"]

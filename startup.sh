#! /bin/bash

sudo apt install openjdk-11-jdk tomcat9 wget -y

sudo systemctl stop tomcat9
sudo wget https://jdbc.postgresql.org/download/postgresql-42.4.2.jar -P 
sudo systemctl start tomcat9
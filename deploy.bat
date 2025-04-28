@echo off
setlocal


set SERVER_USER=root
set SERVER_IP=178.128.100.18
set REMOTE_PATH=/var/www/whiteboard_server/
set ARCHIVE_NAME=deploy.tar.gz

echo  archive
tar -czf %ARCHIVE_NAME% . --exclude=node_modules --exclude=.git


echo  send archive...
scp %ARCHIVE_NAME% %SERVER_USER%@%SERVER_IP%:/tmp/

echo  unarchive...
ssh %SERVER_USER%@%SERVER_IP% "mkdir -p %REMOTE_PATH% && tar -xzf /tmp/%ARCHIVE_NAME% -C %REMOTE_PATH% && rm /tmp/%ARCHIVE_NAME%"


del %ARCHIVE_NAME%

echo deploy finished!
pause

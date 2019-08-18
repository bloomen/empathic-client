#!/bin/bash
set -x
rm -rf build
npm run build
ssh pi@192.168.1.7 'cd ~/workspace/empathic-server/empathic && rm -rf build templates static'
scp -r build pi@192.168.1.7:workspace/empathic-server/empathic/
ssh pi@192.168.1.7 'cd ~/workspace/empathic-server/empathic && mv build templates && mv templates/static static'
ssh pi@192.168.1.7 'sudo systemctl reload apache2'

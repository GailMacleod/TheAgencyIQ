#!/bin/bash
./build.sh && tsx server/index.ts &
sleep 3
curl http://localhost:5000
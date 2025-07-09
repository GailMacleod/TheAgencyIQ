#!/bin/bash
./build.sh && npx tsx server/index.ts &
sleep 3
curl http://localhost:5000
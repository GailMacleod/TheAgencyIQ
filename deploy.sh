#!/bin/bash
./build-esbuild.sh && npx tsx server/index.ts &
sleep 3
curl http://localhost:5000
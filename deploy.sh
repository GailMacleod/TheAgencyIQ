#!/bin/bash
./build-esbuild.sh && node server/index.ts &
sleep 2
curl http://localhost:5000
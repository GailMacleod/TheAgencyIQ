#!/bin/bash
./build.sh && node server/index.ts &
curl http://localhost:5000
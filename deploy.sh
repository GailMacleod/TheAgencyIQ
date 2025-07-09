#!/bin/bash
./build.sh && node server/index.js &
curl http://localhost:5000
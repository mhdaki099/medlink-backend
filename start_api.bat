@echo off
echo Starting MedLink Backend Server...
cd backend
start cmd /k "python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting LocalTunnel (medlink-api-v4)...
cd ..
start cmd /k "npx localtunnel --port 8000 --subdomain medlink-api-v4"

echo Both services started in new windows!

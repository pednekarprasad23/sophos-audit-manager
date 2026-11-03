@echo off
echo ============================================
echo Sophos XG Firewall Audit Manager
echo ============================================
echo.
echo Starting Docker containers...
docker-compose up -d
echo.
echo Waiting for services to start...
timeout /t 10 /nobreak >nul
echo.
echo Checking service status...
docker-compose ps
echo.
echo Application is available at: http://localhost:9005
echo Default credentials: admin / admin
echo.
pause
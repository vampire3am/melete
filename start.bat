@echo off
title Melete Commercial SaaS Platform
echo =======================================================
echo Starting Melete AI Platform (Production Node.js Backend)
echo Platform: http://localhost:8080
echo Admin Dashboard: http://localhost:8080/admin.html
echo Single Question Drill: http://localhost:8080/practice.html
echo =======================================================
start http://localhost:8080
node server.js
pause

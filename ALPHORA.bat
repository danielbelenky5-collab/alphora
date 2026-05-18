@echo off
title ALPHORA — Finance Dashboard
color 0A

echo.
echo  ╔══════════════════════════════════════╗
echo  ║         ALPHORA Finance              ║
echo  ╚══════════════════════════════════════╝
echo.

:: Check if frontend (port 5174) already running
powershell -Command "try { (New-Object Net.Sockets.TcpClient('localhost',5174)).Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
    echo  ✓ Server already running — opening browser...
    goto OPEN
)

:: Start npm run dev in a PERSISTENT window (cmd /k keeps it open)
echo  ► Starting ALPHORA server (keep this window open)...
start "ALPHORA Server — DO NOT CLOSE" cmd /k "cd /d "D:\cloud code projects\project two" && npm run dev"

:: Wait up to 60 seconds for Vite (port 5174) to be ready
set /a attempts=0
:WAIT
timeout /t 2 /nobreak >nul
set /a attempts+=1
powershell -Command "try { (New-Object Net.Sockets.TcpClient('localhost',5174)).Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
    echo  ✓ Server ready after %attempts%x2 seconds!
    goto OPEN
)
echo  ► Waiting... (%attempts%/30)
if %attempts% lss 30 goto WAIT

echo.
echo  ⚠  Server did not start — check the server window for errors.
pause
exit

:OPEN
echo.
echo  ✓ Opening ALPHORA...
timeout /t 1 /nobreak >nul
start "" "http://localhost:5174"
exit

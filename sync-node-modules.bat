@echo off
cd /d "C:\Users\manue\Desktop\gabfix\FinanceMgt\Gabfix-ERP"

REM Delete temporary files (except this one - will be cleaned up after git)
del /q install-all.bat 2>nul
del /q sync-node_modules_store.bat 2>nul
del /q start-install.ps1 2>nul
del /q install-admin.bat 2>nul
del /q check-install.ps1 2>nul

REM Stage all changes
git add -A

REM Commit
git commit -m "Phase 0a: scaffold 3 new apps + rename client->gabfix-administrator"

REM Now delete this batch file
del /q sync-node-modules.bat 2>nul

echo GIT DONE
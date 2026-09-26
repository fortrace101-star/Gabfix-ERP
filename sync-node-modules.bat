@echo off
cd /d "C:\Users\manue\Desktop\gabfix\FinanceMgt\Gabfix-ERP"

REM Delete temporary files
del /q install-all.bat 2>nul
del /q sync-node_modules_store.bat 2>nul
del /q start-install.ps1 2>nul
del /q install-admin.bat 2>nul
del /q check-install.ps1 2>nul

REM Delete build output files
del /q gabfix-store\build-output.txt 2>nul
del /q gabfix-laundry-front-office\build-output.txt 2>nul
del /q gabfix-inhouse-erp\build-output.txt 2>nul
del /q gabfix-administrator\build-output.txt 2>nul

REM Stage all changes
git add -A

REM Commit
git commit -m "chore: clean up temp files after Phase 0a build verification"

echo GIT DONE
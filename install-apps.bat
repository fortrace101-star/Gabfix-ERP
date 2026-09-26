@echo off
cd /d "C:\Users\manue\Desktop\gabfix\FinanceMgt\Gabfix-ERP\gabfix-inhouse-erp"
npm install --maxsockets 1
echo PORTAL DONE
cd /d "C:\Users\manue\Desktop\gabfix\FinanceMgt\Gabfix-ERP\gabfix-store"
npm install --maxsockets 1
echo STORE DONE
echo ALL DONE
@echo off
REM =====================================================
REM 🚀 QUICK MIGRATION SCRIPT (Windows)
REM =====================================================
REM
REM Script untuk mempermudah proses migration role system
REM dengan langkah-langkah yang sudah terurut dan aman.
REM
REM Usage: scripts\quick-migrate.bat
REM =====================================================

setlocal enabledelayedexpansion

REM Colors using ANSI escape codes (Windows 10+)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

REM =====================================================
REM MAIN SCRIPT
REM =====================================================

echo.
echo ======================================================================
echo 🔄 MORIESLY AI - ROLE SYSTEM MIGRATION
echo ======================================================================
echo.

echo %BLUE%ℹ️  This script will help you migrate role system to existing users%NC%
echo %BLUE%ℹ️  Process: Check → Backup → Dry-run → Execute → Verify%NC%
echo.

REM Check if in correct directory
if not exist "scripts\" (
    echo %RED%❌ Please run this script from moriesly-be root directory%NC%
    echo %BLUE%ℹ️  Example: scripts\quick-migrate.bat%NC%
    exit /b 1
)

if not exist "package.json" (
    echo %RED%❌ package.json not found. Are you in the correct directory?%NC%
    exit /b 1
)

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%❌ Node.js is not installed%NC%
    exit /b 1
)

echo %GREEN%✅ Environment check passed%NC%
echo.

REM =====================================================
REM STEP 1: Check Current Status
REM =====================================================

echo.
echo ======================================================================
echo 📊 STEP 1: Checking Current Database Status
echo ======================================================================
echo.

node scripts\check-user-roles.js

echo.
set /p confirm1="Does this look correct? Ready to proceed to backup? (y/n): "
if /i not "%confirm1%"=="y" (
    echo %YELLOW%⚠️  Cancelled by user%NC%
    exit /b 0
)

REM =====================================================
REM STEP 2: Backup
REM =====================================================

echo.
echo ======================================================================
echo 💾 STEP 2: Creating Backup
echo ======================================================================
echo.

REM Get current timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BACKUP_FILE=backup-%datetime:~0,8%-%datetime:~8,6%.json

echo %BLUE%ℹ️  Creating backup file: %BACKUP_FILE%%NC%

node scripts\check-user-roles.js --export %BACKUP_FILE%

if exist "%BACKUP_FILE%" (
    echo %GREEN%✅ Backup created successfully: %BACKUP_FILE%%NC%
) else (
    echo %RED%❌ Failed to create backup%NC%
    exit /b 1
)

echo.
set /p confirm2="Backup created. Proceed to dry-run? (y/n): "
if /i not "%confirm2%"=="y" (
    echo %YELLOW%⚠️  Cancelled by user%NC%
    exit /b 0
)

REM =====================================================
REM STEP 3: Dry-Run Migration
REM =====================================================

echo.
echo ======================================================================
echo 🔍 STEP 3: Dry-Run Migration (No Changes)
echo ======================================================================
echo.

node scripts\migrate-user-roles.js --dry-run

echo.
echo %YELLOW%⚠️  Review the dry-run output above carefully!%NC%
set /p confirm3="Everything looks good? Ready to execute the actual migration? (y/n): "
if /i not "%confirm3%"=="y" (
    echo %YELLOW%⚠️  Cancelled by user%NC%
    exit /b 0
)

REM =====================================================
REM STEP 4: Execute Migration
REM =====================================================

echo.
echo ======================================================================
echo 🚀 STEP 4: Executing Migration
echo ======================================================================
echo.

echo %YELLOW%⚠️  THIS WILL UPDATE YOUR DATABASE!%NC%
echo %BLUE%ℹ️  You can still press Ctrl+C to cancel during the 5-second countdown%NC%
echo.

node scripts\migrate-user-roles.js

if %errorlevel% equ 0 (
    echo.
    echo %GREEN%✅ Migration completed!%NC%
) else (
    echo.
    echo %RED%❌ Migration failed! Check logs above%NC%
    echo %BLUE%ℹ️  Your backup is saved at: %BACKUP_FILE%%NC%
    exit /b 1
)

REM =====================================================
REM STEP 5: Verify Results
REM =====================================================

echo.
echo ======================================================================
echo 🔍 STEP 5: Verifying Results
echo ======================================================================
echo.

node scripts\check-user-roles.js --missing-only

echo.
echo %GREEN%✅ Verification complete!%NC%

REM =====================================================
REM SUMMARY
REM =====================================================

echo.
echo ======================================================================
echo ✨ MIGRATION COMPLETED SUCCESSFULLY
echo ======================================================================
echo.

echo %GREEN%✅ All steps completed without errors%NC%
echo %BLUE%ℹ️  Backup file: %BACKUP_FILE%%NC%
echo.
echo %BLUE%ℹ️  Next steps:%NC%
echo   1. Test the application to ensure everything works
echo   2. Check a few users manually in Firebase Console
echo   3. Monitor for any issues in the next few hours
echo.
echo %BLUE%ℹ️  To upgrade a specific user to PRO:%NC%
echo   node scripts\upgrade-user.js --email user@example.com --role pro
echo.
echo %GREEN%✅ Migration process finished! 🎉%NC%
echo.

pause

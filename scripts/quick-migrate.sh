#!/bin/bash

# =====================================================
# 🚀 QUICK MIGRATION SCRIPT
# =====================================================
#
# Script untuk mempermudah proses migration role system
# dengan langkah-langkah yang sudah terurut dan aman.
#
# Usage: ./scripts/quick-migrate.sh
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo ""
    echo "======================================================================"
    echo "$1"
    echo "======================================================================"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

confirm() {
    echo -e "${YELLOW}$1${NC}"
    read -p "Continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Cancelled by user"
        exit 1
    fi
}

# =====================================================
# MAIN SCRIPT
# =====================================================

print_header "🔄 MORIESLY AI - ROLE SYSTEM MIGRATION"

print_info "This script will help you migrate role system to existing users"
print_info "Process: Check → Backup → Dry-run → Execute → Verify"
echo ""

# Check if in correct directory
if [ ! -d "scripts" ] || [ ! -f "package.json" ]; then
    print_error "Please run this script from moriesly-be root directory"
    print_info "Example: ./scripts/quick-migrate.sh"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

print_success "Environment check passed"
echo ""

# =====================================================
# STEP 1: Check Current Status
# =====================================================

print_header "📊 STEP 1: Checking Current Database Status"

node scripts/check-user-roles.js

echo ""
confirm "Does this look correct? Ready to proceed to backup?"

# =====================================================
# STEP 2: Backup
# =====================================================

print_header "💾 STEP 2: Creating Backup"

BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).json"
print_info "Creating backup file: $BACKUP_FILE"

node scripts/check-user-roles.js --export "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    print_success "Backup created successfully: $BACKUP_FILE"
else
    print_error "Failed to create backup"
    exit 1
fi

echo ""
confirm "Backup created. Proceed to dry-run?"

# =====================================================
# STEP 3: Dry-Run Migration
# =====================================================

print_header "🔍 STEP 3: Dry-Run Migration (No Changes)"

node scripts/migrate-user-roles.js --dry-run

echo ""
print_warning "Review the dry-run output above carefully!"
confirm "Everything looks good? Ready to execute the actual migration?"

# =====================================================
# STEP 4: Execute Migration
# =====================================================

print_header "🚀 STEP 4: Executing Migration"

print_warning "THIS WILL UPDATE YOUR DATABASE!"
print_info "You can still press Ctrl+C to cancel during the 5-second countdown"
echo ""

node scripts/migrate-user-roles.js

echo ""

if [ $? -eq 0 ]; then
    print_success "Migration completed!"
else
    print_error "Migration failed! Check logs above"
    print_info "Your backup is saved at: $BACKUP_FILE"
    exit 1
fi

# =====================================================
# STEP 5: Verify Results
# =====================================================

print_header "🔍 STEP 5: Verifying Results"

node scripts/check-user-roles.js --missing-only

echo ""
print_success "Verification complete!"

# =====================================================
# SUMMARY
# =====================================================

print_header "✨ MIGRATION COMPLETED SUCCESSFULLY"

print_success "All steps completed without errors"
print_info "Backup file: $BACKUP_FILE"
echo ""
print_info "Next steps:"
echo "  1. Test the application to ensure everything works"
echo "  2. Check a few users manually in Firebase Console"
echo "  3. Monitor for any issues in the next few hours"
echo ""
print_info "To upgrade a specific user to PRO:"
echo "  node scripts/upgrade-user.js --email user@example.com --role pro"
echo ""
print_success "Migration process finished! 🎉"
echo ""

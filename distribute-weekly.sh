#!/bin/bash
#
# CLAW Weekly Airdrop Distribution Script
#
# This script runs every Friday at 09:00 GMT to distribute CLAW tokens
# to all verified airdrop participants.
#
# Usage:
#   ./distribute-weekly.sh          # Dry run (preview)
#   ./distribute-weekly.sh --execute # Actually distribute tokens
#
# To schedule via cron:
#   0 9 * * 5 /path/to/distribute-weekly.sh --execute >> /var/log/claw-distribution.log 2>&1
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/claw-distribution.log"
REGISTRY_FILE="$SCRIPT_DIR/airdrop-registry.json"
PROCESSOR_FILE="$SCRIPT_DIR/airdrop-processor.js"

# Timestamp
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# Parse arguments
EXECUTE_MODE=false
if [[ "${1:-}" == "--execute" ]]; then
    EXECUTE_MODE=true
fi

echo "========================================" 2>&1 | tee -a "$LOG_FILE"
echo "CLAW Airdrop Distribution" 2>&1 | tee -a "$LOG_FILE"
echo "Time: $TIMESTAMP" 2>&1 | tee -a "$LOG_FILE"
echo "Mode: $([ "$EXECUTE_MODE" = true ] && echo 'EXECUTE' || echo 'DRY-RUN')" 2>&1 | tee -a "$LOG_FILE"
echo "========================================" 2>&1 | tee -a "$LOG_FILE"

# Check prerequisites
if [ ! -f "$PROCESSOR_FILE" ]; then
    echo "ERROR: airdrop-processor.js not found at $PROCESSOR_FILE" 2>&1 | tee -a "$LOG_FILE"
    exit 1
fi

if [ ! -f "$REGISTRY_FILE" ]; then
    echo "ERROR: airdrop-registry.json not found at $REGISTRY_FILE" 2>&1 | tee -a "$LOG_FILE"
    exit 1
fi

# Run distribution
if [ "$EXECUTE_MODE" = true ]; then
    echo "" 2>&1 | tee -a "$LOG_FILE"
    echo "Executing distribution..." 2>&1 | tee -a "$LOG_FILE"
    node "$PROCESSOR_FILE" --action=distribute --execute 2>&1 | tee -a "$LOG_FILE"
    EXIT_CODE=$?
else
    echo "" 2>&1 | tee -a "$LOG_FILE"
    echo "Dry run - previewing distribution..." 2>&1 | tee -a "$LOG_FILE"
    node "$PROCESSOR_FILE" --action=distribute 2>&1 | tee -a "$LOG_FILE"
    EXIT_CODE=$?
fi

# Summary
echo "" 2>&1 | tee -a "$LOG_FILE"
echo "Distribution script completed with exit code: $EXIT_CODE" 2>&1 | tee -a "$LOG_FILE"
echo "========================================" 2>&1 | tee -a "$LOG_FILE"

exit $EXIT_CODE

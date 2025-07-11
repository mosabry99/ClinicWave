#!/bin/bash
# ClinicWave Setup Script for Unix/Linux/macOS
# This script helps set up the ClinicWave medical clinic management system

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Function to print section headers
print_header() {
  local message=$1
  echo
  print_message "${BOLD}${BLUE}" "====================================================="
  print_message "${BOLD}${BLUE}" "    $message"
  print_message "${BOLD}${BLUE}" "====================================================="
  echo
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Create logs directory if it doesn't exist
mkdir -p logs

# Generate timestamp for log file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="logs/setup_${TIMESTAMP}.log"

# Start logging
echo "ClinicWave Setup Log - $(date)" > "$LOG_FILE"
echo "OS: $(uname -a)" >> "$LOG_FILE"
echo >> "$LOG_FILE"

# Redirect stdout and stderr to both console and log file
exec > >(tee -a "$LOG_FILE") 2>&1

print_header "ClinicWave Setup - Unix/Linux/macOS Installation Helper"

# Check if Python is installed
if ! command_exists python3; then
  print_message "$RED" "[ERROR] Python 3 is not installed or not in PATH."
  print_message "$YELLOW" "Please install Python from https://www.python.org/downloads/"
  exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
print_message "$BLUE" "[INFO] Found Python $PYTHON_VERSION"

# Check if we're running on macOS
if [[ "$(uname)" == "Darwin" ]]; then
  IS_MACOS=true
  print_message "$BLUE" "[INFO] Detected macOS operating system"
else
  IS_MACOS=false
  print_message "$BLUE" "[INFO] Detected $(uname) operating system"
fi

# Installation method selection
echo
print_message "$BLUE" "Please select installation method:"
echo
echo "1. Docker installation (recommended)"
echo "2. Local installation (no Docker)"
echo

read -p "Enter your choice (1 or 2): " INSTALL_CHOICE

SETUP_ARGS=""

if [[ "$INSTALL_CHOICE" == "2" ]]; then
  SETUP_ARGS="--no-docker"
  
  echo
  print_message "$BLUE" "[INFO] Selected local installation without Docker."
  echo
  print_message "$BLUE" "Checking prerequisites for local installation..."
  
  # Check for PostgreSQL
  if ! command_exists psql; then
    print_message "$YELLOW" "[WARNING] PostgreSQL is not installed or not in PATH."
    print_message "$YELLOW" "You may need to install PostgreSQL manually before continuing."
    echo
    
    if [[ "$IS_MACOS" == true ]]; then
      print_message "$BLUE" "On macOS, you can install PostgreSQL with: brew install postgresql@15"
    else
      print_message "$BLUE" "On Linux, you can install PostgreSQL with: sudo apt install postgresql postgresql-contrib"
    fi
    
    echo
    read -p "Do you want to continue anyway? (y/n): " CONTINUE
    if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
      print_message "$RED" "Setup aborted."
      exit 1
    fi
  else
    print_message "$GREEN" "[OK] PostgreSQL found."
  fi
  
  # Check for Redis
  if ! command_exists redis-cli; then
    print_message "$YELLOW" "[WARNING] Redis is not installed or not in PATH."
    print_message "$YELLOW" "You may need to install Redis manually before continuing."
    echo
    
    if [[ "$IS_MACOS" == true ]]; then
      print_message "$BLUE" "On macOS, you can install Redis with: brew install redis"
    else
      print_message "$BLUE" "On Linux, you can install Redis with: sudo apt install redis-server"
    fi
    
    echo
    read -p "Do you want to continue anyway? (y/n): " CONTINUE
    if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
      print_message "$RED" "Setup aborted."
      exit 1
    fi
  else
    print_message "$GREEN" "[OK] Redis found."
  fi
else
  # Default to Docker installation
  echo
  print_message "$BLUE" "[INFO] Selected Docker installation."
  echo
  
  # Check for Docker
  if ! command_exists docker; then
    print_message "$RED" "[ERROR] Docker is not installed or not in PATH."
    print_message "$YELLOW" "Please install Docker from https://www.docker.com/products/docker-desktop"
    exit 1
  else
    print_message "$GREEN" "[OK] Docker found."
  fi
  
  # Check Docker is running
  if ! docker info >/dev/null 2>&1; then
    print_message "$RED" "[ERROR] Docker is not running. Please start Docker."
    exit 1
  else
    print_message "$GREEN" "[OK] Docker is running."
  fi
  
  # Check for Docker Compose
  if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    print_message "$YELLOW" "[WARNING] Docker Compose not found. Make sure Docker Desktop includes Compose."
  else
    print_message "$GREEN" "[OK] Docker Compose found."
  fi
fi

# Additional options
echo
print_message "$BLUE" "Additional options:"
echo

read -p "Skip repository cloning? (y/n, default: n): " SKIP_CLONE
if [[ "$SKIP_CLONE" == "y" || "$SKIP_CLONE" == "Y" ]]; then
  SETUP_ARGS="$SETUP_ARGS --skip-clone"
fi

read -p "Skip prerequisites installation? (y/n, default: n): " SKIP_PREREQS
if [[ "$SKIP_PREREQS" == "y" || "$SKIP_PREREQS" == "Y" ]]; then
  SETUP_ARGS="$SETUP_ARGS --skip-prereqs"
fi

# Make sure setup.py is executable
if [[ -f "setup.py" ]]; then
  chmod +x setup.py
fi

echo
print_message "$BLUE" "[INFO] Running setup script with arguments: $SETUP_ARGS"
print_message "$BLUE" "[INFO] Setup log will be saved to $LOG_FILE"
echo

# Run the setup script
print_message "$BLUE" "[INFO] Starting setup process..."
python3 setup.py $SETUP_ARGS

# Check if setup was successful
if [[ $? -ne 0 ]]; then
  echo
  print_message "$RED" "[ERROR] Setup failed."
  print_message "$YELLOW" "Please check the log file: $LOG_FILE"
  exit 1
fi

print_header "ClinicWave Setup Completed Successfully!"

echo
print_message "$GREEN" "You can access the application at:"
echo
print_message "$BOLD" "Web Application: http://localhost:3000"
print_message "$BOLD" "API Server: http://localhost:4000"
echo
print_message "$GREEN" "Default login credentials:"
print_message "$BOLD" "Email: admin@clinicwave.com"
print_message "$BOLD" "Password: admin123"
echo
print_message "$BLUE" "Log file saved to: $LOG_FILE"
echo

if [[ "$INSTALL_CHOICE" != "2" ]]; then
  print_message "$YELLOW" "Docker services are running in the background."
  print_message "$YELLOW" "Use 'docker-compose logs -f' to view logs."
  print_message "$YELLOW" "Use 'docker-compose down' to stop all services."
else
  print_message "$YELLOW" "Development servers are running in the background."
  print_message "$YELLOW" "Press Ctrl+C to stop the servers when done."
fi

echo
print_message "$GREEN" "Thank you for using ClinicWave!"
echo

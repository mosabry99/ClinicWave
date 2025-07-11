#!/bin/bash
set -e

# ClinicWave Deployment Script
# This script handles deployment for ClinicWave SaaS Medical Clinic Management System
# Usage: ./deploy.sh [environment] [options]
#   environment: dev, staging, production (default: dev)
#   options:
#     --skip-build: Skip the build step
#     --skip-migrations: Skip database migrations
#     --docker-only: Deploy only Docker containers (no Kubernetes)
#     --k8s-only: Deploy only to Kubernetes (no Docker)
#     --help: Show this help message

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
SKIP_BUILD=false
SKIP_MIGRATIONS=false
DOCKER_ONLY=false
K8S_ONLY=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    dev|staging|production)
      ENVIRONMENT="$arg"
      ;;
    --skip-build)
      SKIP_BUILD=true
      ;;
    --skip-migrations)
      SKIP_MIGRATIONS=true
      ;;
    --docker-only)
      DOCKER_ONLY=true
      ;;
    --k8s-only)
      K8S_ONLY=true
      ;;
    --help)
      echo "ClinicWave Deployment Script"
      echo "Usage: ./deploy.sh [environment] [options]"
      echo "  environment: dev, staging, production (default: dev)"
      echo "  options:"
      echo "    --skip-build: Skip the build step"
      echo "    --skip-migrations: Skip database migrations"
      echo "    --docker-only: Deploy only Docker containers (no Kubernetes)"
      echo "    --k8s-only: Deploy only to Kubernetes (no Docker)"
      echo "    --help: Show this help message"
      exit 0
      ;;
  esac
done

# Check for conflicting options
if [ "$DOCKER_ONLY" = true ] && [ "$K8S_ONLY" = true ]; then
  echo -e "${RED}Error: Cannot specify both --docker-only and --k8s-only${NC}"
  exit 1
fi

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Environment file paths
ENV_FILE="$PROJECT_ROOT/.env"
ENV_ENVIRONMENT_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"

# Log function
log() {
  local level="$1"
  local message="$2"
  local color="$NC"
  
  case $level in
    "INFO") color="$BLUE" ;;
    "SUCCESS") color="$GREEN" ;;
    "WARNING") color="$YELLOW" ;;
    "ERROR") color="$RED" ;;
  esac
  
  echo -e "${color}[$level] $message${NC}"
}

# Check if required tools are installed
check_requirements() {
  log "INFO" "Checking requirements..."
  
  # Check for Node.js
  if ! command -v node &> /dev/null; then
    log "ERROR" "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
  fi
  
  # Check for pnpm
  if ! command -v pnpm &> /dev/null; then
    log "ERROR" "pnpm is not installed. Please install pnpm."
    log "INFO" "You can install it with: corepack enable && corepack prepare pnpm@latest --activate"
    exit 1
  fi
  
  # Check for Docker if using Docker deployment
  if [ "$DOCKER_ONLY" = true ] || [ "$K8S_ONLY" = false ]; then
    if ! command -v docker &> /dev/null; then
      log "ERROR" "Docker is not installed. Please install Docker."
      exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
      log "WARNING" "docker-compose not found, checking for Docker Compose plugin..."
      if ! docker compose version &> /dev/null; then
        log "ERROR" "Docker Compose is not installed. Please install Docker Compose."
        exit 1
      fi
    fi
  fi
  
  # Check for kubectl if using Kubernetes deployment
  if [ "$K8S_ONLY" = true ] || [ "$DOCKER_ONLY" = false ]; then
    if ! command -v kubectl &> /dev/null; then
      log "ERROR" "kubectl is not installed. Please install kubectl."
      exit 1
    fi
  fi
  
  log "SUCCESS" "All requirements satisfied."
}

# Load environment variables
load_environment() {
  log "INFO" "Loading environment variables for $ENVIRONMENT environment..."
  
  # Check if .env file exists
  if [ ! -f "$ENV_FILE" ]; then
    log "WARNING" ".env file not found. Creating from .env.example..."
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
      cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
    else
      log "ERROR" ".env.example file not found. Cannot create .env file."
      exit 1
    fi
  fi
  
  # Load environment-specific variables if available
  if [ -f "$ENV_ENVIRONMENT_FILE" ]; then
    log "INFO" "Loading environment-specific variables from $ENV_ENVIRONMENT_FILE"
    set -a
    source "$ENV_ENVIRONMENT_FILE"
    set +a
  fi
  
  # Load base environment variables
  set -a
  source "$ENV_FILE"
  set +a
  
  log "SUCCESS" "Environment variables loaded."
}

# Build the application
build_application() {
  if [ "$SKIP_BUILD" = true ]; then
    log "INFO" "Skipping build step."
    return
  fi
  
  log "INFO" "Building application for $ENVIRONMENT environment..."
  
  # Navigate to project root
  cd "$PROJECT_ROOT"
  
  # Install dependencies
  log "INFO" "Installing dependencies..."
  pnpm install --frozen-lockfile
  
  # Build packages
  log "INFO" "Building packages..."
  if [ "$ENVIRONMENT" = "production" ]; then
    NODE_ENV=production pnpm build
  else
    pnpm build
  fi
  
  log "SUCCESS" "Application built successfully."
}

# Run database migrations
run_migrations() {
  if [ "$SKIP_MIGRATIONS" = true ]; then
    log "INFO" "Skipping database migrations."
    return
  fi
  
  log "INFO" "Running database migrations..."
  
  # Navigate to API package
  cd "$PROJECT_ROOT/packages/api"
  
  # Generate Prisma client
  log "INFO" "Generating Prisma client..."
  npx prisma generate
  
  # Run migrations
  log "INFO" "Applying migrations..."
  if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
    npx prisma migrate deploy
  else
    npx prisma migrate dev
  fi
  
  log "SUCCESS" "Database migrations completed."
}

# Deploy with Docker
deploy_docker() {
  if [ "$K8S_ONLY" = true ]; then
    return
  fi
  
  log "INFO" "Deploying with Docker for $ENVIRONMENT environment..."
  
  # Navigate to project root
  cd "$PROJECT_ROOT"
  
  # Choose the right compose file based on environment
  COMPOSE_FILE="docker-compose.yml"
  if [ -f "docker-compose.$ENVIRONMENT.yml" ]; then
    COMPOSE_FILE="docker-compose.$ENVIRONMENT.yml"
  fi
  
  # Build and start containers
  log "INFO" "Building and starting Docker containers..."
  if command -v docker-compose &> /dev/null; then
    docker-compose -f "$COMPOSE_FILE" up -d --build
  else
    docker compose -f "$COMPOSE_FILE" up -d --build
  fi
  
  log "SUCCESS" "Docker deployment completed."
}

# Deploy with Kubernetes
deploy_kubernetes() {
  if [ "$DOCKER_ONLY" = true ]; then
    return
  fi
  
  log "INFO" "Deploying to Kubernetes for $ENVIRONMENT environment..."
  
  # Navigate to project root
  cd "$PROJECT_ROOT"
  
  # Check if Kubernetes configs exist
  K8S_DIR="$PROJECT_ROOT/k8s/$ENVIRONMENT"
  if [ ! -d "$K8S_DIR" ]; then
    log "ERROR" "Kubernetes configuration directory not found: $K8S_DIR"
    exit 1
  fi
  
  # Apply Kubernetes configurations
  log "INFO" "Applying Kubernetes configurations..."
  kubectl apply -f "$K8S_DIR/"
  
  # Wait for deployments to be ready
  log "INFO" "Waiting for deployments to be ready..."
  kubectl rollout status deployment/clinicwave-api -n clinicwave-$ENVIRONMENT --timeout=300s
  kubectl rollout status deployment/clinicwave-web -n clinicwave-$ENVIRONMENT --timeout=300s
  
  # Run migrations if needed
  if [ "$SKIP_MIGRATIONS" = false ]; then
    log "INFO" "Running migrations in Kubernetes pod..."
    kubectl exec -it deployment/clinicwave-api -n clinicwave-$ENVIRONMENT -- npx prisma migrate deploy
  fi
  
  log "SUCCESS" "Kubernetes deployment completed."
}

# Verify deployment
verify_deployment() {
  log "INFO" "Verifying deployment..."
  
  if [ "$DOCKER_ONLY" = true ] || [ "$K8S_ONLY" = false ]; then
    # Check Docker containers
    log "INFO" "Checking Docker containers..."
    if command -v docker-compose &> /dev/null; then
      docker-compose ps
    else
      docker compose ps
    fi
  fi
  
  if [ "$K8S_ONLY" = true ] || [ "$DOCKER_ONLY" = false ]; then
    # Check Kubernetes pods
    log "INFO" "Checking Kubernetes pods..."
    kubectl get pods -n clinicwave-$ENVIRONMENT
  fi
  
  log "SUCCESS" "Deployment verification completed."
}

# Main deployment process
main() {
  log "INFO" "Starting ClinicWave deployment for $ENVIRONMENT environment..."
  
  # Run deployment steps
  check_requirements
  load_environment
  build_application
  run_migrations
  
  if [ "$DOCKER_ONLY" = true ]; then
    deploy_docker
  elif [ "$K8S_ONLY" = true ]; then
    deploy_kubernetes
  else
    deploy_docker
    deploy_kubernetes
  fi
  
  verify_deployment
  
  log "SUCCESS" "ClinicWave deployment completed successfully!"
  
  # Show access URLs
  if [ "$ENVIRONMENT" = "dev" ]; then
    log "INFO" "API available at: http://localhost:4000"
    log "INFO" "Web app available at: http://localhost:3000"
    log "INFO" "Mailhog (for emails) available at: http://localhost:8025"
  elif [ "$ENVIRONMENT" = "staging" ]; then
    log "INFO" "API available at: https://api.staging.clinicwave.com"
    log "INFO" "Web app available at: https://staging.clinicwave.com"
  elif [ "$ENVIRONMENT" = "production" ]; then
    log "INFO" "API available at: https://api.clinicwave.com"
    log "INFO" "Web app available at: https://clinicwave.com"
  fi
}

# Execute main function
main

#!/usr/bin/env python3
"""
ClinicWave Automated Setup Script

This script automates the entire setup process for the ClinicWave medical clinic management system.
It handles installation of prerequisites, setting up services, and starting the application.

Usage:
    python setup.py [options]

Options:
    --no-docker       Setup without using Docker (install services locally)
    --skip-prereqs    Skip prerequisites installation
    --skip-clone      Skip repository cloning (use current directory)
    --skip-services   Skip services setup (PostgreSQL, Redis, etc.)
    --env-only        Only set up environment variables
    --help            Show this help message

Author: ClinicWave Team
"""

import os
import sys
import platform
import subprocess
import time
import json
import re
import shutil
import argparse
import getpass
import socket
import urllib.request
import webbrowser
from pathlib import Path
from datetime import datetime

# Configuration
REPO_URL = "https://github.com/mosabry99/ClinicWave.git"
REQUIRED_PORTS = [3000, 4000, 5432, 6379, 9000, 9001, 8025]
NODE_VERSION = "18"
PNPM_VERSION = "latest"
POSTGRES_VERSION = "15"
REDIS_VERSION = "7"
MINIO_VERSION = "latest"

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Global variables
OS_TYPE = platform.system().lower()
IS_WINDOWS = OS_TYPE == "windows"
IS_MAC = OS_TYPE == "darwin"
IS_LINUX = OS_TYPE == "linux"
SUDO_PREFIX = "sudo " if IS_LINUX and os.geteuid() != 0 else ""
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(SCRIPT_DIR, "clinicwave_setup.log")

def log(message, level="INFO", color=Colors.BLUE, print_to_console=True):
    """Log a message to the log file and optionally print to console"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_message = f"[{timestamp}] [{level}] {message}"
    
    # Write to log file
    with open(LOG_FILE, "a") as f:
        f.write(log_message + "\n")
    
    # Print to console if requested
    if print_to_console:
        print(f"{color}[{level}] {message}{Colors.ENDC}")

def run_command(command, shell=False, cwd=None, env=None, capture_output=False, check=True, quiet=False):
    """Run a shell command and handle errors"""
    if not quiet:
        log(f"Running: {command}", "COMMAND", Colors.CYAN)
    
    if isinstance(command, str) and not shell:
        command = command.split()
    
    try:
        if capture_output:
            result = subprocess.run(command, shell=shell, cwd=cwd, env=env, 
                                   check=check, text=True, capture_output=True)
            return result.stdout.strip()
        else:
            subprocess.run(command, shell=shell, cwd=cwd, env=env, check=check)
            return True
    except subprocess.CalledProcessError as e:
        log(f"Command failed: {e}", "ERROR", Colors.RED)
        log(f"Command output: {e.stdout if hasattr(e, 'stdout') else ''}", "ERROR", Colors.RED)
        log(f"Command error: {e.stderr if hasattr(e, 'stderr') else ''}", "ERROR", Colors.RED)
        return False
    except Exception as e:
        log(f"Error executing command: {e}", "ERROR", Colors.RED)
        return False

def check_port_available(port):
    """Check if a port is available"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) != 0

def check_url_available(url, timeout=1):
    """Check if a URL is available"""
    try:
        urllib.request.urlopen(url, timeout=timeout)
        return True
    except:
        return False

def is_tool_installed(tool_name):
    """Check if a command-line tool is installed"""
    try:
        if IS_WINDOWS:
            result = subprocess.run(f"where {tool_name}", shell=True, 
                                   capture_output=True, text=True, check=False)
        else:
            result = subprocess.run(f"which {tool_name}", shell=True, 
                                   capture_output=True, text=True, check=False)
        return result.returncode == 0
    except:
        return False

def get_node_version():
    """Get installed Node.js version"""
    try:
        version = run_command("node --version", capture_output=True, check=False, quiet=True)
        if version:
            return version.replace('v', '')
        return None
    except:
        return None

def get_postgres_version():
    """Get installed PostgreSQL version"""
    try:
        if IS_WINDOWS:
            # Check registry or program files
            return None
        else:
            version = run_command("psql --version", capture_output=True, check=False, quiet=True)
            if version:
                match = re.search(r'(\d+\.\d+)', version)
                if match:
                    return match.group(1)
        return None
    except:
        return None

def get_redis_version():
    """Get installed Redis version"""
    try:
        version = run_command("redis-cli --version", capture_output=True, check=False, quiet=True)
        if version:
            match = re.search(r'(\d+\.\d+\.\d+)', version)
            if match:
                return match.group(1)
        return None
    except:
        return None

def check_prerequisites(args):
    """Check if all prerequisites are installed"""
    log("Checking prerequisites...", "INFO", Colors.BLUE)
    
    prerequisites = {
        "git": {"installed": is_tool_installed("git"), "required": True},
        "node": {"installed": is_tool_installed("node"), "version": get_node_version(), "required": True},
        "pnpm": {"installed": is_tool_installed("pnpm"), "required": True},
        "docker": {"installed": is_tool_installed("docker"), "required": not args.no_docker},
        "docker-compose": {"installed": is_tool_installed("docker-compose") or is_tool_installed("docker") and run_command("docker compose version", check=False, quiet=True), "required": not args.no_docker},
        "psql": {"installed": is_tool_installed("psql"), "version": get_postgres_version(), "required": args.no_docker},
        "redis-cli": {"installed": is_tool_installed("redis-cli"), "version": get_redis_version(), "required": args.no_docker},
    }
    
    all_installed = True
    for tool, info in prerequisites.items():
        if info["required"]:
            if info["installed"]:
                version_info = f" (v{info['version']})" if "version" in info and info["version"] else ""
                log(f"✓ {tool} is installed{version_info}", "OK", Colors.GREEN)
            else:
                all_installed = False
                log(f"✗ {tool} is not installed", "ERROR", Colors.RED)
    
    return all_installed

def install_prerequisites(args):
    """Install missing prerequisites"""
    if args.skip_prereqs:
        log("Skipping prerequisites installation as requested.", "INFO", Colors.YELLOW)
        return True
    
    log("Installing missing prerequisites...", "INFO", Colors.BLUE)
    
    # Install Node.js if missing
    if not is_tool_installed("node"):
        log("Installing Node.js...", "INFO", Colors.BLUE)
        if IS_WINDOWS:
            log("Please download and install Node.js manually from: https://nodejs.org/", "INFO", Colors.YELLOW)
            input("Press Enter after installing Node.js...")
        elif IS_MAC:
            run_command("brew install node@18")
            run_command("brew link --overwrite node@18")
        elif IS_LINUX:
            run_command(f"{SUDO_PREFIX}apt update")
            run_command(f"{SUDO_PREFIX}apt install -y curl")
            run_command(f"curl -fsSL https://deb.nodesource.com/setup_18.x | {SUDO_PREFIX}bash -")
            run_command(f"{SUDO_PREFIX}apt install -y nodejs")
    
    # Install pnpm if missing
    if not is_tool_installed("pnpm"):
        log("Installing pnpm...", "INFO", Colors.BLUE)
        run_command("corepack enable")
        run_command(f"corepack prepare pnpm@{PNPM_VERSION} --activate")
    
    # Install Docker if needed and missing
    if not args.no_docker and not is_tool_installed("docker"):
        log("Docker is required but not installed.", "WARNING", Colors.YELLOW)
        log("Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/", "INFO", Colors.YELLOW)
        input("Press Enter after installing Docker...")
    
    # For no-docker mode, install PostgreSQL and Redis if missing
    if args.no_docker:
        if not is_tool_installed("psql"):
            log("Installing PostgreSQL...", "INFO", Colors.BLUE)
            if IS_WINDOWS:
                log("Please download and install PostgreSQL manually from: https://www.postgresql.org/download/windows/", "INFO", Colors.YELLOW)
                input("Press Enter after installing PostgreSQL...")
            elif IS_MAC:
                run_command(f"brew install postgresql@{POSTGRES_VERSION}")
                run_command(f"brew services start postgresql@{POSTGRES_VERSION}")
            elif IS_LINUX:
                run_command(f"{SUDO_PREFIX}apt update")
                run_command(f"{SUDO_PREFIX}apt install -y postgresql postgresql-contrib")
                run_command(f"{SUDO_PREFIX}systemctl start postgresql")
                run_command(f"{SUDO_PREFIX}systemctl enable postgresql")
        
        if not is_tool_installed("redis-cli"):
            log("Installing Redis...", "INFO", Colors.BLUE)
            if IS_WINDOWS:
                log("Please download and install Redis manually from: https://github.com/microsoftarchive/redis/releases", "INFO", Colors.YELLOW)
                input("Press Enter after installing Redis...")
            elif IS_MAC:
                run_command("brew install redis")
                run_command("brew services start redis")
            elif IS_LINUX:
                run_command(f"{SUDO_PREFIX}apt update")
                run_command(f"{SUDO_PREFIX}apt install -y redis-server")
                run_command(f"{SUDO_PREFIX}systemctl start redis-server")
                run_command(f"{SUDO_PREFIX}systemctl enable redis-server")
    
    # Verify installation
    return check_prerequisites(args)

def clone_repository(args):
    """Clone the ClinicWave repository"""
    if args.skip_clone:
        log("Skipping repository cloning as requested.", "INFO", Colors.YELLOW)
        return True
    
    log("Cloning ClinicWave repository...", "INFO", Colors.BLUE)
    
    # Check if we're already in the repository
    if os.path.exists(".git") and os.path.exists("packages"):
        log("Already in ClinicWave repository, skipping clone.", "INFO", Colors.GREEN)
        return True
    
    # Clone the repository
    repo_dir = os.path.join(os.getcwd(), "ClinicWave")
    if os.path.exists(repo_dir):
        log(f"Directory {repo_dir} already exists.", "WARNING", Colors.YELLOW)
        choice = input(f"Do you want to remove and re-clone? (y/N): ").lower()
        if choice == 'y':
            shutil.rmtree(repo_dir)
        else:
            log("Using existing repository.", "INFO", Colors.BLUE)
            os.chdir(repo_dir)
            return True
    
    success = run_command(f"git clone {REPO_URL}")
    if success:
        os.chdir(repo_dir)
        log("Repository cloned successfully.", "SUCCESS", Colors.GREEN)
        return True
    else:
        log("Failed to clone repository.", "ERROR", Colors.RED)
        return False

def setup_environment(args):
    """Set up environment variables"""
    log("Setting up environment variables...", "INFO", Colors.BLUE)
    
    env_example = os.path.join(os.getcwd(), ".env.example")
    env_file = os.path.join(os.getcwd(), ".env")
    
    # Check if .env.example exists
    if not os.path.exists(env_example):
        log(".env.example file not found.", "ERROR", Colors.RED)
        return False
    
    # Check if .env already exists
    if os.path.exists(env_file):
        log(".env file already exists.", "INFO", Colors.YELLOW)
        choice = input("Do you want to overwrite it? (y/N): ").lower()
        if choice != 'y':
            log("Using existing .env file.", "INFO", Colors.BLUE)
            return True
    
    # Copy .env.example to .env
    shutil.copy(env_example, env_file)
    log(".env file created from template.", "SUCCESS", Colors.GREEN)
    
    # Ask if user wants to customize environment variables
    choice = input("Do you want to customize environment variables? (y/N): ").lower()
    if choice == 'y':
        log("Please edit the .env file manually.", "INFO", Colors.YELLOW)
        if IS_WINDOWS:
            os.system(f"notepad {env_file}")
        elif IS_MAC:
            os.system(f"open -a TextEdit {env_file}")
        else:
            editor = os.environ.get("EDITOR", "nano")
            os.system(f"{editor} {env_file}")
    
    # Update database connection for no-docker mode
    if args.no_docker:
        with open(env_file, 'r') as f:
            env_content = f.read()
        
        # Update PostgreSQL connection
        env_content = re.sub(
            r'DATABASE_URL=.*',
            'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clinicwave?schema=public',
            env_content
        )
        
        # Update Redis connection
        env_content = re.sub(
            r'REDIS_URL=.*',
            'REDIS_URL=redis://localhost:6379',
            env_content
        )
        
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        log("Environment variables updated for local setup.", "SUCCESS", Colors.GREEN)
    
    return True

def setup_database(args):
    """Set up the database"""
    if args.skip_services:
        log("Skipping database setup as requested.", "INFO", Colors.YELLOW)
        return True
    
    log("Setting up database...", "INFO", Colors.BLUE)
    
    if args.no_docker:
        # Create database for local PostgreSQL
        log("Creating PostgreSQL database...", "INFO", Colors.BLUE)
        
        db_name = "clinicwave"
        db_user = "postgres"
        db_password = "postgres"
        
        if IS_WINDOWS:
            # For Windows, use psql with password file
            with open("pgpass.conf", "w") as f:
                f.write(f"localhost:5432:*:{db_user}:{db_password}")
            
            os.environ["PGPASSFILE"] = os.path.abspath("pgpass.conf")
            create_db_cmd = f'psql -U {db_user} -c "CREATE DATABASE {db_name};"'
            success = run_command(create_db_cmd, shell=True, check=False)
            
            # Clean up password file
            os.remove("pgpass.conf")
            
        elif IS_MAC:
            # For macOS, try createdb
            success = run_command(f"createdb {db_name}", check=False)
            if not success:
                log("Failed to create database. Trying with psql...", "WARNING", Colors.YELLOW)
                success = run_command(f'psql -c "CREATE DATABASE {db_name};"', shell=True, check=False)
        
        elif IS_LINUX:
            # For Linux, use sudo -u postgres
            success = run_command(f'{SUDO_PREFIX}sudo -u postgres psql -c "CREATE DATABASE {db_name};"', shell=True, check=False)
        
        if not success:
            log("Failed to create database. It may already exist or there might be connection issues.", "WARNING", Colors.YELLOW)
            choice = input("Continue anyway? (Y/n): ").lower()
            if choice == 'n':
                return False
    
    return True

def setup_redis(args):
    """Set up Redis"""
    if args.skip_services or not args.no_docker:
        return True
    
    log("Checking Redis service...", "INFO", Colors.BLUE)
    
    # Check if Redis is running
    redis_running = False
    
    if IS_WINDOWS:
        # Check Windows service
        result = run_command("sc query redis", shell=True, capture_output=True, check=False, quiet=True)
        redis_running = result and "RUNNING" in result
    elif IS_MAC:
        # Check brew service
        result = run_command("brew services list | grep redis", shell=True, capture_output=True, check=False, quiet=True)
        redis_running = result and "started" in result
    elif IS_LINUX:
        # Check systemd service
        result = run_command("systemctl is-active redis-server", shell=True, capture_output=True, check=False, quiet=True)
        redis_running = result and "active" in result
    
    if not redis_running:
        log("Redis service is not running.", "WARNING", Colors.YELLOW)
        log("Starting Redis service...", "INFO", Colors.BLUE)
        
        if IS_WINDOWS:
            run_command("sc start redis", shell=True, check=False)
        elif IS_MAC:
            run_command("brew services start redis")
        elif IS_LINUX:
            run_command(f"{SUDO_PREFIX}systemctl start redis-server")
    else:
        log("Redis service is running.", "SUCCESS", Colors.GREEN)
    
    # Test Redis connection
    log("Testing Redis connection...", "INFO", Colors.BLUE)
    result = run_command("redis-cli ping", shell=True, capture_output=True, check=False)
    if result and "PONG" in result:
        log("Redis connection successful.", "SUCCESS", Colors.GREEN)
        return True
    else:
        log("Failed to connect to Redis.", "ERROR", Colors.RED)
        return False

def install_dependencies():
    """Install project dependencies"""
    log("Installing project dependencies...", "INFO", Colors.BLUE)
    
    # Install dependencies with pnpm
    success = run_command("pnpm install")
    if success:
        log("Dependencies installed successfully.", "SUCCESS", Colors.GREEN)
        return True
    else:
        log("Failed to install dependencies.", "ERROR", Colors.RED)
        return False

def setup_database_schema():
    """Set up database schema with Prisma"""
    log("Setting up database schema...", "INFO", Colors.BLUE)
    
    # Navigate to API package
    os.chdir(os.path.join(os.getcwd(), "packages", "api"))
    
    # Generate Prisma client
    log("Generating Prisma client...", "INFO", Colors.BLUE)
    success = run_command("npx prisma generate")
    if not success:
        log("Failed to generate Prisma client.", "ERROR", Colors.RED)
        return False
    
    # Run migrations
    log("Running database migrations...", "INFO", Colors.BLUE)
    success = run_command("npx prisma migrate dev --name init", check=False)
    if not success:
        log("Failed to run migrations. Trying with deploy...", "WARNING", Colors.YELLOW)
        success = run_command("npx prisma migrate deploy", check=False)
        if not success:
            log("Failed to run migrations.", "ERROR", Colors.RED)
            return False
    
    # Seed database
    log("Seeding database with demo data...", "INFO", Colors.BLUE)
    success = run_command("npx prisma db seed", check=False)
    if not success:
        log("Failed to seed database.", "WARNING", Colors.YELLOW)
        choice = input("Continue anyway? (Y/n): ").lower()
        if choice == 'n':
            return False
    
    # Return to project root
    os.chdir(os.path.join(os.getcwd(), "..", ".."))
    
    log("Database schema setup completed.", "SUCCESS", Colors.GREEN)
    return True

def start_application(args):
    """Start the ClinicWave application"""
    log("Starting ClinicWave application...", "INFO", Colors.BLUE)
    
    if args.no_docker:
        # Start with pnpm dev
        log("Starting development servers...", "INFO", Colors.BLUE)
        
        # Use subprocess.Popen to start in background
        try:
            process = subprocess.Popen(
                "pnpm dev",
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            log("Development servers started in background.", "SUCCESS", Colors.GREEN)
            log("Waiting for services to be ready...", "INFO", Colors.BLUE)
            
            # Wait for services to be ready
            max_wait = 60  # Maximum wait time in seconds
            interval = 2   # Check interval in seconds
            api_ready = False
            web_ready = False
            
            for _ in range(int(max_wait / interval)):
                if not api_ready and check_url_available("http://localhost:4000/health"):
                    log("API server is ready at http://localhost:4000", "SUCCESS", Colors.GREEN)
                    api_ready = True
                
                if not web_ready and check_url_available("http://localhost:3000"):
                    log("Web application is ready at http://localhost:3000", "SUCCESS", Colors.GREEN)
                    web_ready = True
                
                if api_ready and web_ready:
                    break
                
                time.sleep(interval)
            
            if not api_ready or not web_ready:
                log("Services did not start properly within the timeout period.", "WARNING", Colors.YELLOW)
                return False
            
            return True
        
        except Exception as e:
            log(f"Error starting development servers: {e}", "ERROR", Colors.RED)
            return False
    else:
        # Start with Docker Compose
        log("Starting Docker containers...", "INFO", Colors.BLUE)
        
        # Check if docker-compose or docker compose is available
        if is_tool_installed("docker-compose"):
            docker_compose_cmd = "docker-compose"
        else:
            docker_compose_cmd = "docker compose"
        
        # Start containers
        success = run_command(f"{docker_compose_cmd} up -d --build")
        if not success:
            log("Failed to start Docker containers.", "ERROR", Colors.RED)
            return False
        
        log("Docker containers started successfully.", "SUCCESS", Colors.GREEN)
        log("Waiting for services to be ready...", "INFO", Colors.BLUE)
        
        # Wait for services to be ready
        max_wait = 120  # Maximum wait time in seconds
        interval = 3    # Check interval in seconds
        api_ready = False
        web_ready = False
        
        for _ in range(int(max_wait / interval)):
            if not api_ready and check_url_available("http://localhost:4000/health"):
                log("API server is ready at http://localhost:4000", "SUCCESS", Colors.GREEN)
                api_ready = True
            
            if not web_ready and check_url_available("http://localhost:3000"):
                log("Web application is ready at http://localhost:3000", "SUCCESS", Colors.GREEN)
                web_ready = True
            
            if api_ready and web_ready:
                break
            
            time.sleep(interval)
        
        if not api_ready or not web_ready:
            log("Services did not start properly within the timeout period.", "WARNING", Colors.YELLOW)
            log("Check Docker logs with: docker-compose logs -f", "INFO", Colors.YELLOW)
            return False
        
        return True

def push_to_github():
    """Push changes to GitHub"""
    log("Checking for changes to push to GitHub...", "INFO", Colors.BLUE)
    
    # Check if we're in a git repository
    if not os.path.exists(".git"):
        log("Not in a git repository.", "WARNING", Colors.YELLOW)
        return False
    
    # Check if there are changes
    status = run_command("git status --porcelain", capture_output=True)
    if not status:
        log("No changes to commit.", "INFO", Colors.GREEN)
        return True
    
    # Add changes
    log("Adding changes...", "INFO", Colors.BLUE)
    success = run_command("git add .")
    if not success:
        log("Failed to add changes.", "ERROR", Colors.RED)
        return False
    
    # Commit changes
    log("Committing changes...", "INFO", Colors.BLUE)
    commit_message = "Update setup files and documentation"
    success = run_command(f'git commit -m "{commit_message}"')
    if not success:
        log("Failed to commit changes.", "ERROR", Colors.RED)
        return False
    
    # Push changes
    log("Pushing changes to GitHub...", "INFO", Colors.BLUE)
    success = run_command("git push")
    if not success:
        log("Failed to push changes.", "ERROR", Colors.RED)
        return False
    
    log("Changes pushed to GitHub successfully.", "SUCCESS", Colors.GREEN)
    return True

def open_browser(url="http://localhost:3000"):
    """Open the browser to the application"""
    log(f"Opening {url} in browser...", "INFO", Colors.BLUE)
    webbrowser.open(url)

def main():
    """Main function to run the setup process"""
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="ClinicWave Automated Setup Script")
    parser.add_argument("--no-docker", action="store_true", help="Setup without using Docker")
    parser.add_argument("--skip-prereqs", action="store_true", help="Skip prerequisites installation")
    parser.add_argument("--skip-clone", action="store_true", help="Skip repository cloning")
    parser.add_argument("--skip-services", action="store_true", help="Skip services setup")
    parser.add_argument("--env-only", action="store_true", help="Only set up environment variables")
    args = parser.parse_args()
    
    # Create log file
    with open(LOG_FILE, "w") as f:
        f.write(f"ClinicWave Setup Log - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"OS: {platform.system()} {platform.release()}\n")
        f.write(f"Python: {platform.python_version()}\n\n")
    
    # Print welcome message
    print(f"\n{Colors.BOLD}{Colors.BLUE}======================================{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}  ClinicWave Automated Setup Script  {Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}======================================{Colors.ENDC}\n")
    
    # Check ports
    log("Checking if required ports are available...", "INFO", Colors.BLUE)
    ports_in_use = []
    for port in REQUIRED_PORTS:
        if not check_port_available(port):
            ports_in_use.append(port)
    
    if ports_in_use:
        log(f"The following ports are already in use: {', '.join(map(str, ports_in_use))}", "WARNING", Colors.YELLOW)
        choice = input("Do you want to continue anyway? (y/N): ").lower()
        if choice != 'y':
            log("Setup aborted.", "INFO", Colors.RED)
            return
    
    # Setup steps
    steps = [
        {"name": "Check Prerequisites", "function": check_prerequisites},
        {"name": "Install Prerequisites", "function": install_prerequisites},
        {"name": "Clone Repository", "function": clone_repository},
        {"name": "Setup Environment", "function": setup_environment},
        {"name": "Setup Database", "function": setup_database},
        {"name": "Setup Redis", "function": setup_redis}
    ]
    
    # Skip to environment setup if env-only flag is set
    if args.env_only:
        log("Running in environment-only mode.", "INFO", Colors.YELLOW)
        if setup_environment(args):
            log("Environment setup completed successfully.", "SUCCESS", Colors.GREEN)
        else:
            log("Environment setup failed.", "ERROR", Colors.RED)
        return
    
    # Run setup steps
    for step in steps:
        log(f"Step: {step['name']}...", "INFO", Colors.BLUE)
        success = step["function"](args)
        if not success:
            log(f"{step['name']} failed. Setup aborted.", "ERROR", Colors.RED)
            return
    
    # Install dependencies
    if not install_dependencies():
        log("Failed to install dependencies. Setup aborted.", "ERROR", Colors.RED)
        return
    
    # Setup database schema
    if not setup_database_schema():
        log("Failed to set up database schema. Setup aborted.", "ERROR", Colors.RED)
        return
    
    # Start application
    if not start_application(args):
        log("Failed to start application. Setup aborted.", "ERROR", Colors.RED)
        return
    
    # Push changes to GitHub
    push_to_github()
    
    # Open browser
    open_browser()
    
    # Print success message
    print(f"\n{Colors.BOLD}{Colors.GREEN}======================================{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.GREEN}  ClinicWave Setup Completed!  {Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.GREEN}======================================{Colors.ENDC}\n")
    
    print(f"{Colors.CYAN}Web Application: {Colors.BOLD}http://localhost:3000{Colors.ENDC}")
    print(f"{Colors.CYAN}API Server: {Colors.BOLD}http://localhost:4000{Colors.ENDC}")
    
    if not args.no_docker:
        print(f"\n{Colors.YELLOW}Docker services are running in the background.{Colors.ENDC}")
        print(f"{Colors.YELLOW}Use 'docker-compose logs -f' to view logs.{Colors.ENDC}")
        print(f"{Colors.YELLOW}Use 'docker-compose down' to stop all services.{Colors.ENDC}")
    else:
        print(f"\n{Colors.YELLOW}Development servers are running in the background.{Colors.ENDC}")
        print(f"{Colors.YELLOW}Press Ctrl+C to stop the servers when done.{Colors.ENDC}")
    
    print(f"\n{Colors.GREEN}Default login credentials:{Colors.ENDC}")
    print(f"{Colors.GREEN}Email: admin@clinicwave.com{Colors.ENDC}")
    print(f"{Colors.GREEN}Password: admin123{Colors.ENDC}")
    
    print(f"\n{Colors.BLUE}Setup log saved to: {LOG_FILE}{Colors.ENDC}")
    print(f"\n{Colors.BOLD}Thank you for using ClinicWave!{Colors.ENDC}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Setup interrupted by user.{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Error: {e}{Colors.ENDC}")
        print(f"{Colors.RED}Check the log file for details: {LOG_FILE}{Colors.ENDC}")
        sys.exit(1)

#!/bin/bash

echo "🚀 Setting up Finance Tracker Application..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed. Please install Python 3 first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js first."
    exit 1
fi

# Create virtual environment for backend
echo "📦 Setting up Python virtual environment..."
cd backend
python3 -m venv venv

# Activate virtual environment and install dependencies
echo "🔧 Installing Python dependencies..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    source venv/Scripts/activate
else
    # macOS/Linux
    source venv/bin/activate
fi

pip install -r requirements.txt

cd ..

# Setup frontend
echo "🎨 Setting up React frontend..."
cd frontent  # Note: keeping the typo as it matches your folder structure

# Copy the corrected package.json if it doesn't exist or is empty
if [ ! -s package.json ]; then
    echo "📝 Creating package.json..."
    cat > package.json << 'EOF'
{
  "name": "finance-tracker-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.4",
    "@testing-library/react": "^13.3.0",
    "@testing-library/user-event": "^13.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "recharts": "^2.8.0",
    "lucide-react": "^0.263.1",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24"
  },
  "proxy": "http://localhost:5000"
}
EOF
fi

# Install frontend dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install additional dependencies that might be missing
npm install --save lucide-react recharts

# Install Tailwind CSS
echo "🎨 Setting up Tailwind CSS..."
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Create PostCSS config
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

cd ..

echo "✅ Setup complete!"
echo ""
echo "🔧 To start the application:"
echo "1. Run the backend: chmod +x run.sh && ./run.sh"
echo "2. In a new terminal, start the frontend: cd frontent && npm start"
echo ""
echo "📝 Note: Make sure to copy the package.json content from the setup artifacts"
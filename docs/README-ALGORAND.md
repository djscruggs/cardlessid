# Algorand Testing Setup

This document explains how to set up and use Algorand testing tools for the Cardless ID project.

## 🚀 **Quick Start**

### **Option 1: Testnet (Recommended for Development)**
```bash
# Test connection to Algorand Testnet
npm run test:algorand:testnet

# Test wallet operations
npm run test:algorand:wallet

# Test credential operations
npm run test:algorand:credential
```

### **Option 2: LocalNet (Advanced Testing)**
```bash
# Set up local Algorand node
npm run setup:localnet

# Start local node
goal node start -d ~/algorand-localnet/node/data

# Test local connection
npm run test:algorand:localnet
```

### **Option 3: Docker LocalNet**
```bash
# Start Algorand node with Docker
npm run docker:localnet

# Test Docker setup
npm run test:algorand:localnet

# Stop Docker setup
npm run docker:localnet:stop
```

## 📁 **Directory Structure**

```
cardless-remix/
├── app/
│   ├── utils/
│   │   └── algorand.ts          # Algorand utilities
│   └── routes/
│       └── api/
│           └── algorand/        # API routes for testing
├── scripts/
│   ├── test-algorand.js         # Main testing script
│   └── localnet-setup.js        # LocalNet setup
├── docker/
│   └── algorand-localnet.yml    # Docker configuration
└── tests/
    ├── algorand.test.js         # Test files
    └── fixtures/                # Test data
```

## 🧪 **Testing Commands**

### **Basic Tests**
```bash
# Test all components
npm run test:algorand

# Test specific components
npm run test:algorand:testnet     # Testnet connection
npm run test:algorand:localnet    # Local node connection
npm run test:algorand:wallet      # Wallet operations
npm run test:algorand:credential  # Credential operations
```

### **Advanced Testing**
```bash
# Run specific test with custom parameters
node scripts/test-algorand.js testnet --verbose
node scripts/test-algorand.js wallet --address YOUR_ADDRESS
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# .env.local
VITE_APP_WALLET_ADDRESS=YOUR_WALLET_ADDRESS
VITE_ALGORAND_NETWORK=testnet  # or localnet
```

### **Network Configuration**
- **Testnet**: `https://testnet-api.algonode.cloud`
- **Mainnet**: `https://mainnet-api.algonode.cloud`
- **LocalNet**: `http://localhost:4001`

## 🐳 **Docker Setup**

### **Prerequisites**
```bash
# Install Docker and Docker Compose
# Make sure ports 4001, 4002, 8980 are available
```

### **Start LocalNet**
```bash
# Start Algorand node
npm run docker:localnet

# Check status
docker ps

# View logs
docker logs algorand-localnet
```

### **Stop LocalNet**
```bash
# Stop and remove containers
npm run docker:localnet:stop
```

## 🧪 **Testing Workflow**

### **1. Development Testing**
```bash
# Start your app
npm run dev

# In another terminal, test Algorand
npm run test:algorand:testnet
npm run test:algorand:wallet
```

### **2. Integration Testing**
```bash
# Test credential creation
npm run test:algorand:credential

# Test with your app
# Go to /app/create-credential
# Fill out form and submit
# Check console for Algorand operations
```

### **3. LocalNet Testing**
```bash
# Set up local node
npm run setup:localnet

# Start local node
goal node start -d ~/algorand-localnet/node/data

# Test local connection
npm run test:algorand:localnet

# Create test accounts
goal account new
goal account new
```

## 🔍 **Troubleshooting**

### **Common Issues**

**1. Connection Failed**
```bash
# Check if Algorand node is running
curl http://localhost:4001/v2/status

# Check network connectivity
ping testnet-api.algonode.cloud
```

**2. Wallet Issues**
```bash
# Check wallet address
echo $VITE_APP_WALLET_ADDRESS

# Get test ALGO from faucet
# Visit: https://testnet.algoexplorer.io/dispenser
```

**3. Docker Issues**
```bash
# Check Docker status
docker ps

# Check logs
docker logs algorand-localnet

# Restart containers
npm run docker:localnet:stop
npm run docker:localnet
```

### **Debug Mode**
```bash
# Enable verbose logging
DEBUG=algorand* npm run test:algorand

# Check specific components
node scripts/test-algorand.js testnet --verbose
```

## 📚 **Additional Resources**

- [Algorand Developer Portal](https://developer.algorand.org/)
- [Algorand SDK Documentation](https://github.com/algorand/js-algorand-sdk)
- [LocalNet Setup Guide](https://developer.algorand.org/docs/get-details/docker/)
- [Testnet Faucet](https://testnet.algoexplorer.io/dispenser)


# ⚡️ PulsePay

PulsePay is a next-generation Web3 payment ecosystem that allows seamless, gasless transactions with the user experience of a traditional Web2 fintech application.

## 🌟 Overview

PulsePay strips away the complexities of blockchain technology. Users log in with standard credentials (via Firebase Auth) while a non-custodial Web3 wallet is generated behind the scenes. This enables true decentralized ownership without the hassle of seed phrases or gas fees.

## 🏗️ Architecture

The project consists of three main components:

1. **📱 iOS Client (`/PulsePay`)**
   - Built with **SwiftUI** for a native, glassmorphic, fluid user experience.
   - Integrates **Web3Auth** for seamless Firebase-backed JWT social logins.
   - Uses **web3swift** for executing blockchain transactions directly on iOS.
   - Features real-time balance syncing and transaction history.

2. **⚙️ Backend API (`/backend`)**
   - Built with **Node.js** and **Express**.
   - Uses **MongoDB** for secure user, merchant, and off-chain transaction state tracking.
   - Handles the issuance of custom Firebase authentication JWTs.
   - Acts as the relayer/indexer for blockchain states.

3. **📊 Web Dashboard (`/backend/dashboard`)**
   - Built with **React** and **Vite**.
   - Provides analytics, merchant controls, and transaction monitoring.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running locally or via Atlas.
- Xcode 15+ (for iOS App)

### 1. Setup Backend
```bash
cd backend
npm install
npm run dev
```
*(Ensure you have created a `.env` file in the backend directory based on `.env.example`)*

### 2. Setup Web Dashboard
```bash
cd backend/dashboard
npm install
npm run dev
```

### 3. Setup iOS App
1. Open `PulsePay.xcodeproj` in Xcode.
2. Wait for Swift Package Manager to resolve `web3swift` and `Web3Auth`.
3. Select your Simulator or physical device.
4. Hit **Run (Cmd + R)**.

## 🔐 Security & Web3 Native
- **Zero Knowledge**: Private keys are generated via Multi-Party Computation (MPC) directly on the device.
- **Gasless Infrastructure**: Transactions are designed to route through Alchemy's ERC-4337 Account Abstraction Paymasters.
- **Environment Safety**: API Keys and Database secrets are strictly isolated and `.gitignore` enforced.

---
*Built for the future of payments.*

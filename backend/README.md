# PulsePay Backend

Node/Express backend for PulsePay streaming utility payments.

## What this server covers

- Admin login and dashboard APIs.
- User and provider wallet registry.
- Service registry for EV, WiFi, parking, and gym providers.
- Streaming session lifecycle: start, tick, stop.
- Mongo-backed ledger, receipts, and settlement records.
- Blockchain-ready settlement service with `erc4337`, `superfluid`, and `offchain` modes.
- MetaMask Embedded Wallets-ready wallet linking surface.

## Run locally

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:5000/api/health
```

Admin login:

```bash
curl -X POST http://localhost:5000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pulsepay.local","password":"change-me"}'
```

## Production notes

The server does not custody private keys. MetaMask Embedded Wallets/Web3Auth should own user key material on the client or through MPC. This backend stores wallet addresses, chain metadata, receipt hashes, provider records, and settlement intent/transaction state.

The current blockchain service is provider-ready: it creates deterministic receipt hashes and settlement records, and exposes a single service boundary where ERC-4337 bundler calls or Superfluid stream calls can be swapped in once contract addresses and provider credentials exist.

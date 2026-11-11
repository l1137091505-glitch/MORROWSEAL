# MORROWSEAL

MORROWSEAL is an original local-first result commitment workspace for BOT Chain. It creates a deterministic `bytes32` commitment from a context, private result, and 32-byte salt. The original text and salt remain in the browser; the optional smart-contract interaction records only the commitment and a later author confirmation.

## Repository map

- `frontend/` — Vite + TypeScript interface with EIP-6963 wallet discovery.
- `contracts/src/MorrowSeal.sol` — privacy-preserving receipt registry.
- `DEPLOY-ZH.md` — Chinese deployment guide.
- `VERIFICATION.md` — validation notes.

## Local development

```bash
cd frontend
npm install
npm run dev
```

Without `VITE_MORROWSEAL_ADDRESS`, all local seal/open and JSON export tools remain available while contract writes are disabled.

## Security boundary

Never upload a private opening file. The contract does not prove that the author truly checked the preimage; `confirmOpening` records the author's statement that the local check succeeded. Review and audit the contract before production use.

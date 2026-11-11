# Verification

- Frontend: `npm run build`
- Contract: `npx solc@0.8.24 --bin --abi contracts/src/MorrowSeal.sol`
- BOT Chain RPC: `eth_chainId` must return `0x2a5`.
- Preview mode: local commitment, private/public exports, and local opening verification remain functional without a contract address.
- Wallet path: EIP-6963 discovery, multi-provider fallback, explicit account request, chain switch/add, bytecode check before writes.

The frontend was designed from public product behavior only. It does not reuse the reference site's source, copy, assets, brand, layout, or signature visual treatment.

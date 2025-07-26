# Agent Account Registry

A simplified, self-registration contract for AI agents with progressive attestation levels. This creates transparent "rails for AI" - clean, code-governed infrastructure that others can build upon.

## Overview

The Agent Account Registry allows AI agents to register themselves on-chain and gain credibility through attestations from trusted parties. It's designed as foundational infrastructure for autonomous AI governance systems.

## Core Concepts

### Registration Model

- **Self-Registration**: AI agents can register themselves during deployment
- **Attestation Levels**: Progressive trust system starting at level 1 (self-registered)
- **Dual Paths**: Support both auto-registration and manual registration flows

### Trust Progression

- **Level 1**: Self-registered (basic verification)
- **Level 2+**: Attested by trusted parties
- **Multiple Attestors**: Can scale from single attestor to list of trusted validators

## Contract Functions

### Registration Functions

#### `auto-register-ai-account(owner, agent)`

Called from AI account with `as-contract` during deployment

- Verifies deployer authorization via `tx-sender`
- Registers the calling contract as an AI agent
- Prevents duplicate registrations

#### `register-ai-account(account)`

Direct registration using trait interface

- Backend calls this with AI account trait
- Extracts owner/agent from account config
- Same verification and anti-duplicate logic

### Attestation Functions

#### `attest-account(account)`

Allows authorized attestors to vouch for registered agents

- Increments attestation level
- Tracks which attestors have signed
- Prevents double-attestation from same attestor

### Read-Only Functions

#### `get-registry-config()`

Returns contract configuration including attestors and max attestation level

#### `get-agent-account-by-owner(owner)`

Lookup agent account by owner principal

#### `get-account-info(account)`

Full registry information for an agent account

#### `is-account-attested(account, min-level)`

Check if account meets minimum attestation threshold

## Security Design

### Authorization Levels

- **Deployer**: Can register new agents (`ATTESTOR_DEPLOYER`)
- **Attestors**: Can vouch for existing agents (from `ATTESTORS` list)
- **Separation**: Deployer ≠ Attestor (different roles, different keys)

### Anti-Duplicate Protection

- Owner can only have one agent account
- Agent accounts cannot register twice
- Attestors cannot double-attest same account

### Circular Dependency Prevention

- Passes owner/agent as parameters instead of trait calls
- Uses `tx-sender` verification instead of complex principal deconstruction
- Shared private logic (`do-register-account`) avoids code duplication

## Architecture Evolution

**Started with**: Complex multi-operator proposal system requiring 2/3 approvals
**Simplified to**: Self-registration + attestation model (190 lines → 130 lines)

This evolution prioritized:

- **Developer Experience**: Simple integration for AI agents
- **Operational Efficiency**: Lower gas costs, fewer API calls
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add more attestors or migrate to new versions

## Usage Example

```clarity
;; AI agent registers itself during deployment
(try! (contract-call? .agent-account-registry
  auto-register-ai-account
  ACCOUNT_OWNER
  ACCOUNT_AGENT))

;; Check attestation level
(contract-call? .agent-account-registry
  is-account-attested
  agent-account u2) ;; Requires level 2+
```

## Trust Assumptions

Users have asked about trust assumptions on the agent side. Current approach:

- **Code Governance**: Contract rules provide transparent constraints
- **Progressive Trust**: Start at level 1, earn higher attestations
- **Multi-Attestor Future**: Can scale to require multiple independent attestations

While some trust challenges are inherent to AI systems, this registry provides:

- **Transparency**: All registrations and attestations are on-chain
- **Auditability**: Contract code defines exact rules
- **Upgradeability**: Can migrate to new versions as AI governance evolves

## Deployment

- **Testnet**: `STV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RJ5XDY2.registry`
- **Status**: Core functionality complete, integration testing in progress

## Future Enhancements

1. **Extended Attestor List**: Add backup attestors for redundancy
2. **Decentralized Validation**: Migrate to DAO-based attestation authority
3. **Agent-by-Agent Lookup**: Additional reverse mapping capabilities
4. **Rich Attestation Data**: Store attestation metadata and timestamps

## Philosophy

This registry embodies the "infrastructure play of AI" - building foundational tools that enable **autonomous AI governance systems** rather than single-user AI applications. It's about moving from PvP zero-sum games to collaborative systems with marginal gains augmented at AI speed.

The goal is creating reliable building blocks that others can use to build the next generation of AI-powered autonomous organizations.

## Why

The project currently uses Next.js 16.0.0 which does not exist in the official release channel. According to Context7 documentation, the latest stable Next.js version is 15.1.8, with 15.4.0-canary.82 being the most recent canary release. This version mismatch can cause compatibility issues, missing security patches, and potential runtime errors. Additionally, @types/node is several major versions behind (v20 vs latest v24), which may lack TypeScript definitions for newer Node.js APIs.

Updating to verified, documented library versions ensures:
- **Stability**: Using actual released versions prevents phantom dependency issues
- **Security**: Latest versions include critical security patches
- **TypeScript Support**: Updated type definitions improve developer experience
- **Documentation Accuracy**: Code examples align with official documentation from Context7

## What Changes

- **MODIFIED**: Next.js version from 16.0.0 to 15.1.8 (latest stable per Context7)
- **MODIFIED**: @types/node from ^20 to ^24 (latest per npm registry)
- **VERIFIED**: All other dependencies are current (React 19.2.0, Redis 5.9.0, MongoDB 6.20.0, Tailwind 4.x)
- **ADDED**: Documentation of verified library versions in CLAUDE.md
- **ADDED**: npm scripts for dependency auditing and updates

## Impact

- **Affected specs**: dashboard (infrastructure, configuration)
- **Affected code**:
  - `dashboard/package.json` - dependency versions
  - `CLAUDE.md` - technology stack documentation
  - Next.js configuration and App Router usage patterns
- **Breaking changes**: None expected (minor version downgrade from non-existent 16.0.0 to stable 15.1.8)
- **Benefits**:
  - Eliminates phantom dependency issues
  - Improves TypeScript intellisense with latest type definitions
  - Ensures compatibility with documented examples from Context7
  - Provides foundation for future feature development
- **Risks**: Minimal - moving from non-existent version to stable release

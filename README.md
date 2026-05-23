# Aedventure Virtual Office

This repository contains the product and technical planning documents for the
Aedventure Customer Virtual Office App.

The project starts by forking SkyOffice and turning it into a maintainable,
tenant-ready customer application. The SaaS Foundation/backoffice remains the
intended control plane for tenants, users, roles, permissions, subscriptions,
audit, and configuration, but the first engineering milestone is the Customer
Virtual Office App itself.

## Canonical Documentation

- [Global Product and Technical Specification](docs/customer-virtual-office-platform-spec.md)
- [Phase 0 Refactor Plan](docs/phase-0-refactor-plan.md)
- [SkyOffice Fork Maintenance](docs/skyoffice-fork-maintenance.md)
- [Phase 0 Baseline Verification](docs/phase-0-baseline-verification.md)

## Source Layout

- `apps/customer-virtual-office/` - SkyOffice fork imported with upstream Git
  history preserved as a subtree.
- `docs/` - product, architecture, and phase planning documents.

## Starting Position

1. Start with the Customer Virtual Office App.
2. Fork SkyOffice.
3. Treat Step 0 as a major refactor, not a feature sprint.
4. Keep the product usable after each refactor step.
5. Defer commercial asset/licensing cleanup until a much later stage.
6. Design every core data model so it can become tenant-customizable.
7. Design APIs so future AI agents can safely inspect and operate the system.

## Early Non-Goals

- Rebuilding the SaaS Foundation from scratch.
- Building the full map editor immediately.
- Replacing all SkyOffice assets immediately.
- Implementing enterprise Google Meet, Teams, or Zoom integrations in Step 0.
- Implementing production AI agents in Step 0.
- Building a large-scale broadcast system before validating the core virtual
  office experience.

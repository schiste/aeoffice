# SkyOffice Fork Maintenance

## 1. Import Strategy

SkyOffice is imported as a non-squashed Git subtree at:

```text
apps/customer-virtual-office/
```

This keeps the upstream SkyOffice commits visible in this repository's Git
history while allowing this project to keep documentation and future platform
code at the repository root.

Upstream remote:

```text
skyoffice https://github.com/kevinshen56714/SkyOffice.git
```

Imported upstream HEAD:

```text
3f66b8bffad889ee9fc2340f9bcad28146299f47
```

## 2. Why Subtree Instead Of Plain Copy

A plain file copy loses the original commit graph.

A subtree import:

- Preserves upstream commits in the repository graph.
- Keeps upstream attribution clear.
- Allows future upstream pulls.
- Avoids nested `.git` directories.
- Lets our app live under `apps/customer-virtual-office/`.

## 3. Future Upstream Pulls

To fetch upstream updates:

```bash
git fetch skyoffice
```

To merge upstream changes into the app subtree:

```bash
git subtree pull --prefix=apps/customer-virtual-office skyoffice master
```

Do not use `--squash` if the goal is to keep upstream commit history.

## 4. Commit Hygiene

Avoid mixing these concerns in a single commit:

- Upstream imports.
- File moves.
- Package renames.
- Behavioral refactors.
- Formatting-only changes.
- Asset cleanup.

Preferred sequence:

1. Import upstream.
2. Verify baseline.
3. Add docs.
4. Refactor one boundary at a time.
5. Rename after behavior is stable.

## 5. Asset Policy

All inherited SkyOffice assets should be treated as development-only until a
commercial licensing review is complete.

Do not remove or replace assets during Phase 0 unless they block local
development. Production asset cleanup is a later commercial-readiness phase.

## 6. Local Backup Note

An initial plain-copy import was moved out of the repository before the subtree
import.

Temporary backup path:

```text
/private/tmp/aedventure-skyoffice-copy-without-history
```

This backup is not part of the project and can be deleted later if no longer
needed.


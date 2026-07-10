# Changelog

All notable changes to VHS Tap are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-07-10

### Fixed
- Auto-playback to a Jellyfin device (e.g. NVIDIA Shield) now works. The play
  command sent its parameters in the request body, which Jellyfin rejected with
  HTTP 400, so tapping a tag silently failed to start on the TV. Parameters are
  now sent as query parameters, so a scan reliably starts the movie on your
  active Jellyfin session.

## [1.1.0] - 2026-07-10

### Added
- **Library browser** in the admin panel — browse your full Jellyfin movie
  library as a poster grid with live filtering and an "on a tape" badge,
  instead of typing to search.
- **Rescan Library** button — trigger a Jellyfin library scan from the admin
  panel so newly added movies get indexed, then refresh the picker.
- **QR codes on tape cards** — each tape shows a locally generated QR code of
  its scan URL (with a click-to-enlarge view) so a phone can grab the URL
  without manual typing.
- **Automatic movie metadata** — tapes now auto-fetch OMDB metadata (poster,
  plot, cast, rating, runtime, etc.) on creation and when their movie changes,
  plus a "Fetch Missing Metadata" backfill for existing tapes.
- **Randomized NFC tokens** — tokens now default to a strong random value
  (client-side generation with a regenerate button, plus a server-side
  backstop) to prevent URL farming, while still allowing custom tokens.
- Application **version** is now shown in the admin footer and returned by the
  `/health` and `/api/config` endpoints.

### Changed
- Relicensed under the **PolyForm Noncommercial License 1.0.0**, attributed to
  8bits1beard LLC (previously mislabeled MIT in some files).
- Added 8bits1beard LLC attribution to the admin panel and scan page footers.

### Removed
- The non-functional "Be Kind, Rewind" footer badge.

## [1.0.0] - 2026

### Added
- Initial release: map NFC tokens to Jellyfin movies, mobile scan page with
  rich metadata, automatic playback to active Jellyfin sessions, retro-styled
  admin panel, and a REST API for managing tapes.

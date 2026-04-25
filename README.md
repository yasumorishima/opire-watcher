# opire-watcher

Periodic snapshot of open bounties on [Opire](https://opire.dev).

- Source: `api.opire.dev/rewards` (public REST endpoint, no auth)
- Schedule: every 3 hours via GitHub Actions
- New bounties are posted as comments to issue [#1](../../issues/1)
- Full history is kept in [`data/bounties.json`](./data/bounties.json)

> This repository is a personal bounty log. Unsolicited "I can implement this" comments or write-access requests will be reported as spam and the author blocked. Issue #1 is locked; interaction is limited to collaborators.

## Current snapshot

<!-- stats-start -->

_Last updated: 2026-04-25_

**Tracked total:** 37 / **$20,340.22** | **Candidates:** 1 / **$50**

### 🟢 Candidates (CANDIDATE + CAUTION, by reward)

- **$50** — [[BOUNTY] WearOS Support [$1340]](https://github.com/microg/GmsCore/issues/2843) *(microg)* `Java`

### Top repos (by total reward)

| Repo owner | Count | Total |
| --- | ---: | ---: |
| godotengine | 1 | $13,380 |
| hexgrad | 1 | $1,620 |
| uswriting | 1 | $1,500 |
| falkordb | 2 | $1,000 |
| autokey | 1 | $350 |

### Top languages (by total reward)

| Language | Count | Total |
| --- | ---: | ---: |
| C++ | 4 | $13,670 |
| C | 5 | $2,720 |
| JavaScript | 4 | $1,755 |
| Rust | 5 | $677 |
| TypeScript | 8 | $560 |
| Python | 4 | $518.22 |
| Java | 3 | $280 |
| PHP | 2 | $250 |

### Latest 20 (with verdict)

- 🔴AVOID (7att/11pr) **$80** — [[Proposal] Support configuring permissions of automatic tokens of Actions jobs](https://github.com/go-gitea/gitea/issues/24635) *(go-gitea)*
- ❓UNKNOWN **$70** — [macOS: dialog.showOpenDialog fails to show custom macOS packages (LSTypeIsPackage) when filtered by extension in Electron 36.2.0+ (worked in 35.7.5; 36.0.0 showed all files)](https://github.com/electron/electron/issues/48191) *(electron)*
- 🟢CANDIDATE **$50** — [[BOUNTY] WearOS Support [$1340]](https://github.com/microg/GmsCore/issues/2843) *(microg)*
- ❓UNKNOWN **$30** — [[BOUNTY] RCS Support [14999$]](https://github.com/microg/GmsCore/issues/2994) *(microg)*
- 🔴AVOID (0att/4pr) **$48.22** — [Request to execute qtop across two HPC clusters and apply first step of differential debugging](https://github.com/qtop/qtop/issues/337) *(qtop)*
- 🔴AVOID **$40** — [Implement ST7789 parallel protocol in PIO](https://github.com/tinygo-org/pio/issues/38) *(tinygo-org)*
- 🔴AVOID (3att/7pr) **$1,620** — [Donation/funding for german language](https://github.com/hexgrad/kokoro/issues/290) *(hexgrad)*
- 🔴AVOID (0att/3pr) **$150** — [Support for Ethernet peripheral (ESP32 / ESP32-P4)](https://github.com/esp-rs/esp-hal/issues/4163) *(esp-rs)*
- 🔴AVOID **$20** — [Image resize](https://github.com/ArcaneCircle/pixelsocial/issues/3) *(ArcaneCircle)*
- 🔴AVOID **$100** — [Tray icon should have an orange dot indicator](https://github.com/aueangpanit/electron-template/issues/1) *(aueangpanit)*
- 🔴AVOID (0att/1pr) **$100** — [Crash](https://github.com/FalkorDB/FalkorDB/issues/622) *(FalkorDB)*
- 🔴AVOID (0att/16pr) **$900** — [Crash found in fuzzer](https://github.com/FalkorDB/FalkorDB/issues/636) *(FalkorDB)*
- 🔴AVOID (1att/7pr) **$200** — [Replace tut with doctest](https://github.com/secondlife/viewer/issues/4445) *(secondlife)*
- ❓UNKNOWN **$20** — [Images on the bottom of level up messages](https://github.com/buape/kiai-bounties/issues/1) *(buape)*
- 🔴AVOID **$20** — [CPU usage 4x higher in ROS 2 than ROS 1](https://github.com/mavlink/mavros/issues/2031) *(mavlink)*
- 🔴AVOID **$40** — [feat(Universal patch): microG / GmsCore universal patch](https://github.com/ReVanced/revanced-patches/issues/1583) *(ReVanced)*
- 🔴AVOID (0att/3pr) **$1,500** — [Asynchronous Web APIs](https://github.com/uswriting/zeroperl/issues/7) *(uswriting)*
- 🔴AVOID **$20** — [SSTV RX](https://github.com/portapack-mayhem/mayhem-firmware/issues/2045) *(portapack-mayhem)*
- 🔴AVOID **$20** — [Nest js icons](https://github.com/tal7aouy/vscode-icons/issues/87) *(pwvux)*
- 🔴AVOID **$40** — [Is there a matrix size limit?](https://github.com/RichieHakim/sparse_convolution/issues/1) *(RichieHakim)*

<!-- stats-end -->

## Manual run

```
gh workflow run "Opire Bounty Watch" -f memo="manual check"
```

## Local

```
npm install
npm run fetch
npm run update-readme
```

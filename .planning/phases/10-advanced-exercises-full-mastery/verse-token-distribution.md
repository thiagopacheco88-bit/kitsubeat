# Verse-Token Distribution Audit (Phase 10 Plan 05)

> Generated: 2026-04-18T08:51:28.082Z — run via `tsx scripts/audit/verse-token-distribution.ts`

**12-token cap** is CONTEXT-locked for Sentence Order v1. This audit is informational; the cap applies on a PER-VERSE basis (over-cap verses are excluded from Sentence Order for that song, not the whole song).

## Summary

- Total song_versions with lesson content: **130**
- Songs with **≥3 eligible verses** (≤12 tokens): **109** (83.8%)
- Songs with **1-2 eligible verses**: **17**
- Songs with **0 eligible verses** (skip Sentence Order): **4**

> **Healthy:** ≥80% of songs clear the ≥3-verse bar. No follow-up required for Plan 05.

## Per-song table

| # | slug | version | total_verses | eligible_verses (≤12 tok) | eligible_pct |
|---|------|---------|--------------|---------------------------|--------------|
| 1 | golden-time-lover-sukima-switch | full | 15 | 0 | 0.0% |
| 2 | link-larcenciel | full | 6 | 0 | 0.0% |
| 3 | motherland-crystal-kay | full | 5 | 0 | 0.0% |
| 4 | newsong-tacica | full | 5 | 0 | 0.0% |
| 5 | adamas-lisa | full | 9 | 1 | 11.1% |
| 6 | reason-reona | full | 8 | 1 | 12.5% |
| 7 | period-chemistry | full | 7 | 1 | 14.3% |
| 8 | pinocchio-ore-ska-band | full | 7 | 1 | 14.3% |
| 9 | u-can-do-it-domino | full | 6 | 1 | 16.7% |
| 10 | utakata-hanabi-supercell | full | 6 | 1 | 16.7% |
| 11 | nakushita-kotoba-no-regret-life | full | 5 | 1 | 20.0% |
| 12 | again-yui | full | 12 | 3 | 25.0% |
| 13 | moshimo-daisuke | full | 8 | 2 | 25.0% |
| 14 | tsunaida-te-lilb | full | 8 | 2 | 25.0% |
| 15 | kesenai-tsumi-nana-kitade | full | 11 | 3 | 27.3% |
| 16 | overfly-luna-haruna | full | 7 | 2 | 28.6% |
| 17 | remember-flow | full | 7 | 2 | 28.6% |
| 18 | the-reluctant-heroes-mpi | full | 7 | 2 | 28.6% |
| 19 | name-of-love-cinema-staff | full | 6 | 2 | 33.3% |
| 20 | niji-no-kanata-ni-reona | full | 6 | 2 | 33.3% |
| 21 | red-swan-yoshiki-feat-hyde | full | 6 | 2 | 33.3% |
| 22 | long-kiss-goodbye-halcali | full | 8 | 3 | 37.5% |
| 23 | mother-mucc | full | 8 | 3 | 37.5% |
| 24 | my-answer-seamo | full | 8 | 3 | 37.5% |
| 25 | no-boy-no-cry-stance-punks | full | 8 | 3 | 37.5% |
| 26 | line-sukima-switch | full | 10 | 4 | 40.0% |
| 27 | niji-no-oto-eir-aoi | full | 5 | 2 | 40.0% |
| 28 | no-more-time-machine-lisa | full | 7 | 3 | 42.9% |
| 29 | unlasting-lisa | full | 7 | 3 | 42.9% |
| 30 | iris-eir-aoi | full | 8 | 4 | 50.0% |
| 31 | jiyuu-no-daishou-linked-horizon | full | 8 | 4 | 50.0% |
| 32 | let-it-out-miho-fukuhara | full | 12 | 6 | 50.0% |
| 33 | mountain-a-go-go-too-captain-straydum | full | 4 | 2 | 50.0% |
| 34 | the-rumbling-sim | full | 6 | 3 | 50.0% |
| 35 | undo-cool-joke | full | 8 | 4 | 50.0% |
| 36 | hajimete-kimi-to-shabetta-gagagasp | full | 7 | 4 | 57.1% |
| 37 | call-your-name-mpi-casg | full | 10 | 6 | 60.0% |
| 38 | for-you-azu | full | 10 | 6 | 60.0% |
| 39 | mayonaka-no-orchestra-aqua-timez | full | 10 | 6 | 60.0% |
| 40 | viva-rock-japanese-side-orange-range | full | 5 | 3 | 60.0% |
| 41 | courage-haruka-tomatsu | full | 8 | 5 | 62.5% |
| 42 | heroes-brian-the-sun | full | 8 | 5 | 62.5% |
| 43 | kara-no-kokoro-anly | full | 8 | 5 | 62.5% |
| 44 | call-your-name-gv-gemie | full | 11 | 7 | 63.6% |
| 45 | under-the-tree-sim | full | 6 | 4 | 66.7% |
| 46 | ima-made-nando-mo-the-mass-missile | full | 10 | 7 | 70.0% |
| 47 | innocence-eir-aoi | full | 10 | 7 | 70.0% |
| 48 | diver-nico-touches-the-walls | full | 7 | 5 | 71.4% |
| 49 | great-escape-cinema-staff | full | 7 | 5 | 71.4% |
| 50 | guren-does | full | 7 | 5 | 71.4% |
| 51 | tobira-no-mukou-e-yellow-generation | full | 7 | 5 | 71.4% |
| 52 | uso-sid | full | 7 | 5 | 71.4% |
| 53 | shirushi-lisa | full | 11 | 8 | 72.7% |
| 54 | flame-dish | full | 8 | 6 | 75.0% |
| 55 | guren-no-zahyou-linked-horizon | full | 8 | 6 | 75.0% |
| 56 | chasing-hearts-miwa | full | 10 | 8 | 80.0% |
| 57 | ray-of-light-shoko-nakagawa | full | 20 | 16 | 80.0% |
| 58 | catch-the-moment-lisa | full | 11 | 9 | 81.8% |
| 59 | rewrite-asian-kung-fu-generation | full | 11 | 9 | 81.8% |
| 60 | separate-ways-haruka-tomatsu | full | 13 | 11 | 84.6% |
| 61 | crossing-field-lisa | full | 7 | 6 | 85.7% |
| 62 | shinkokyuu-super-beaver | full | 14 | 12 | 85.7% |
| 63 | spinning-world-diana-garnet | full | 7 | 6 | 85.7% |
| 64 | harmonia-rythem | full | 8 | 7 | 87.5% |
| 65 | mezamero-yasei-matchy-with-question | full | 8 | 7 | 87.5% |
| 66 | melissa-porno-graffitti | full | 9 | 8 | 88.9% |
| 67 | freedom-home-made-kazoku | full | 10 | 9 | 90.0% |
| 68 | ignite-eir-aoi | full | 10 | 9 | 90.0% |
| 69 | itterasshai-ai-higuchi | full | 10 | 9 | 90.0% |
| 70 | good-luck-my-way-larcenciel | full | 11 | 10 | 90.9% |
| 71 | soba-ni-iru-kara-amadori | full | 11 | 10 | 90.9% |
| 72 | resolution-haruka-tomatsu | full | 13 | 12 | 92.3% |
| 73 | sonna-kimi-konna-boku-thinking-dogs | full | 14 | 13 | 92.9% |
| 74 | broken-youth-nico-touches-the-walls | full | 15 | 14 | 93.3% |
| 75 | scenario-saboten | full | 15 | 14 | 93.3% |
| 76 | go-flow | full | 16 | 15 | 93.8% |
| 77 | resister-asca | full | 16 | 15 | 93.8% |
| 78 | parade-chaba | full | 17 | 16 | 94.1% |
| 79 | akatsuki-no-requiem-linked-horizon | full | 28 | 28 | 100.0% |
| 80 | akuma-no-ko-ai-higuchi | full | 30 | 30 | 100.0% |
| 81 | alumina-nightmare | full | 10 | 10 | 100.0% |
| 82 | bauklotze-mika-kobayashi | full | 14 | 14 | 100.0% |
| 83 | blue-bird-ikimonogakari | full | 20 | 20 | 100.0% |
| 84 | boku-no-sensou-shinsei-kamattechan | full | 14 | 14 | 100.0% |
| 85 | butter-fly-koji-wada | full | 39 | 39 | 100.0% |
| 86 | call-of-silence-gemie | full | 12 | 12 | 100.0% |
| 87 | distance-long-shot-party | full | 8 | 8 | 100.0% |
| 88 | doa-aimee-blackschleger | full | 9 | 9 | 100.0% |
| 89 | doraemon-no-uta-kumiko-osugi | full | 21 | 21 | 100.0% |
| 90 | forget-me-not-reona | full | 14 | 14 | 100.0% |
| 91 | haruka-kanata-asian-kung-fu-generation | full | 6 | 6 | 100.0% |
| 92 | heros-come-back-nobodyknows | full | 12 | 12 | 100.0% |
| 93 | hitotsu-yane-no-shita-uno-sachiko | full | 13 | 13 | 100.0% |
| 94 | i-can-hear-dish | full | 10 | 10 | 100.0% |
| 95 | i-will-sowelu | full | 10 | 10 | 100.0% |
| 96 | kaze-ni-naru-ayano-tsuji | full | 25 | 25 | 100.0% |
| 97 | kiss-kiss-kiss-snow | full | 19 | 19 | 100.0% |
| 98 | lost-heaven-larcenciel | full | 9 | 9 | 100.0% |
| 99 | mezase-pokemon-master-rica-matsumoto | full | 32 | 32 | 100.0% |
| 100 | misa-no-uta-aya-hirano | full | 6 | 6 | 100.0% |
| 101 | odoru-ponpokorin-bb-queens | full | 8 | 8 | 100.0% |
| 102 | place-to-try-totalfat | full | 15 | 15 | 100.0% |
| 103 | pokemon-getto-da-ze-rica-matsumoto | full | 15 | 15 | 100.0% |
| 104 | ready-steady-go-larcenciel | full | 17 | 17 | 100.0% |
| 105 | renai-circulation-kana-hanazawa | full | 32 | 32 | 100.0% |
| 106 | rocks-hound-dog | full | 11 | 11 | 100.0% |
| 107 | saigo-no-kyojin-linked-horizon | full | 16 | 16 | 100.0% |
| 108 | sanpo-azumi-inoue | full | 18 | 18 | 100.0% |
| 109 | seishun-wa-hanabi-no-you-ni-linked-horizon | full | 12 | 12 | 100.0% |
| 110 | sekai-ga-owaru-made-wa-wands | full | 23 | 23 | 100.0% |
| 111 | shougeki-yuko-ando | full | 12 | 12 | 100.0% |
| 112 | shunkan-sentimental-scandal | full | 12 | 12 | 100.0% |
| 113 | sign-flow | full | 13 | 13 | 100.0% |
| 114 | speed-analogfish | full | 8 | 8 | 100.0% |
| 115 | startear-luna-haruna | full | 7 | 7 | 100.0% |
| 116 | the-day-porno-graffitti | full | 8 | 8 | 100.0% |
| 117 | the-world-nightmare | full | 11 | 11 | 100.0% |
| 118 | thedogs-mpi | full | 11 | 11 | 100.0% |
| 119 | tk-0n-ttn-mika-kobayashi | full | 9 | 9 | 100.0% |
| 120 | tonari-no-totoro-azumi-inoue | full | 23 | 23 | 100.0% |
| 121 | trishas-lullaby-warsaw-philharmonic-orchestra-choir | full | 5 | 5 | 100.0% |
| 122 | vogel-im-kafig-cyua | full | 8 | 8 | 100.0% |
| 123 | wareta-ringo-risa-taneda | full | 20 | 20 | 100.0% |
| 124 | whats-up-people-maximum-the-hormone | full | 6 | 6 | 100.0% |
| 125 | wind-akeboshi | full | 6 | 6 | 100.0% |
| 126 | yamanaiame-mica-caldito-mpi-mika-kobayashi | full | 5 | 5 | 100.0% |
| 127 | yellow-moon-akeboshi | full | 7 | 7 | 100.0% |
| 128 | yume-wo-kanaete-doraemon-mao | full | 20 | 20 | 100.0% |
| 129 | zero-eclipse-laco | full | 6 | 6 | 100.0% |
| 130 | zetsubou-billy-maximum-the-hormone | full | 8 | 8 | 100.0% |

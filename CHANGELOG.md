# Changelog

## [0.3.0](https://github.com/aideon-ai/aideon-desktop/compare/v0.2.0...v0.3.0) (2026-07-19)


### Features

* **design-system:** build and enforce design system foundation (ADR-0010) ([#283](https://github.com/aideon-ai/aideon-desktop/issues/283)) ([de7af95](https://github.com/aideon-ai/aideon-desktop/commit/de7af95b268f5b6e594bbdcaef252c5b72259c87))
* **design-system:** define color.provenance.* tokens so provenance badges render ([#569](https://github.com/aideon-ai/aideon-desktop/issues/569), [#565](https://github.com/aideon-ai/aideon-desktop/issues/565)) ([#821](https://github.com/aideon-ai/aideon-desktop/issues/821)) ([e3a632f](https://github.com/aideon-ai/aideon-desktop/commit/e3a632f3f000d0b691a5f4d553c423f5a3950cc5))
* **gui:** wire the Topos canvas into the shell (M0 first slice) ([#815](https://github.com/aideon-ai/aideon-desktop/issues/815)) ([f995816](https://github.com/aideon-ai/aideon-desktop/commit/f9958162ca41f7cf07523b7c66ae42c0a653ff30))
* **host:** collapse the command envelope into one tested adapter ([#357](https://github.com/aideon-ai/aideon-desktop/issues/357)) ([#360](https://github.com/aideon-ai/aideon-desktop/issues/360)) ([7b9b8bd](https://github.com/aideon-ai/aideon-desktop/commit/7b9b8bd66b09eee6dc50c6286248fdaf1e5b2d92))
* **host:** M0 foundation host layer — lifecycle, codegen, proof-carrying readiness ([#362](https://github.com/aideon-ai/aideon-desktop/issues/362)) ([bac3f59](https://github.com/aideon-ai/aideon-desktop/commit/bac3f59b34f0b5442e3f5fc8a44ca2fb8018693c))
* **M0:** agent-resolved batch — CI gates, lifecycle events, schema drift, ResizableShell ([#364](https://github.com/aideon-ai/aideon-desktop/issues/364)) ([62f79a1](https://github.com/aideon-ai/aideon-desktop/commit/62f79a178b40eb1d14c8719fb17b30f687a00a96))
* **m0:** land the Foundation milestone (canonical workspace) + twin-authoring slice ([#783](https://github.com/aideon-ai/aideon-desktop/issues/783)) ([371f71f](https://github.com/aideon-ai/aideon-desktop/commit/371f71f94c6770aebe589a8d2c309dc50aa62760))
* **m0:** TDD boundary check — extract collect_boundary_violations + CI gate ([#366](https://github.com/aideon-ai/aideon-desktop/issues/366)) ([10373ff](https://github.com/aideon-ai/aideon-desktop/commit/10373ff4dfd8d9b8910531a16978aac41494495f))
* **m1:** deliver task-first meaning authoring ([#825](https://github.com/aideon-ai/aideon-desktop/issues/825)) ([37da0af](https://github.com/aideon-ai/aideon-desktop/commit/37da0af2c32bfa9611e1e0b328f0f9e67a97bd80))
* **m1:** meaning — metamodel compile, validation, authoring, UI + gates ([#793](https://github.com/aideon-ai/aideon-desktop/issues/793)) ([1450d35](https://github.com/aideon-ai/aideon-desktop/commit/1450d35e6075bf9346b34162949f89f1ea1a49fa))
* **mneme:** M0 foundation — canonical workspace, derived runtime, rebuild oracle ([#314](https://github.com/aideon-ai/aideon-desktop/issues/314)) ([00f6f83](https://github.com/aideon-ai/aideon-desktop/commit/00f6f83da17db7ca553239710449867daff1cb0a))
* **shell:** add widget is one canonical action, three entry points ([#828](https://github.com/aideon-ai/aideon-desktop/issues/828)) ([df1756c](https://github.com/aideon-ai/aideon-desktop/commit/df1756c52f8df94b398493663286be605967e06c))


### Bug Fixes

* **build:** drop AppImage from bundle targets (de-flake release builds) ([#313](https://github.com/aideon-ai/aideon-desktop/issues/313)) ([0f25223](https://github.com/aideon-ai/aideon-desktop/commit/0f2522358e3aefced841aa001faf78b7a66b9492))
* **ci:** unblock main — sonarjs 4 lint errors + prettier-ignore release files ([#312](https://github.com/aideon-ai/aideon-desktop/issues/312)) ([e83affa](https://github.com/aideon-ai/aideon-desktop/commit/e83affaac41fe77b4e434a1febb3d7adf7309cc1))
* **ci:** valid release workflow + prune deleted mneme surface → CI green ([#307](https://github.com/aideon-ai/aideon-desktop/issues/307)) ([adf7063](https://github.com/aideon-ai/aideon-desktop/commit/adf70635398bf26d07a943f3edbe874282e62bcc))
* **m0:** align @tauri-apps/plugin-log with crate to unblock the M0 CI gate ([#816](https://github.com/aideon-ai/aideon-desktop/issues/816)) ([437f22b](https://github.com/aideon-ai/aideon-desktop/commit/437f22bea0dc88d7b58963f6d0c27df9ec24da60))
* **release:** switch release-please to simple type (unblock releases) ([#310](https://github.com/aideon-ai/aideon-desktop/issues/310)) ([6f1cca3](https://github.com/aideon-ai/aideon-desktop/commit/6f1cca3db1f80ff41521dbfdbc37bf2eee295d1c))
* **security:** clear all actionable Codacy issues (12 critical + 2 medium + 7 minor) ([#789](https://github.com/aideon-ai/aideon-desktop/issues/789)) ([87081a5](https://github.com/aideon-ai/aideon-desktop/commit/87081a5f23334ddccb9e9c429fb7ec44f7d33d30))
* **security:** pin third-party actions to SHA + clear test-only High findings ([#790](https://github.com/aideon-ai/aideon-desktop/issues/790)) ([a3a3fa8](https://github.com/aideon-ai/aideon-desktop/commit/a3a3fa8384674e0ad3c0aa9be1fe519ceaf8864c))
* **security:** resolve remaining Codacy findings at source ([#791](https://github.com/aideon-ai/aideon-desktop/issues/791)) ([369964c](https://github.com/aideon-ai/aideon-desktop/commit/369964cbe29d7bbc91e28089094f0eed43e250e8))
* **selection:** rename widget selection kind to artefact ([#826](https://github.com/aideon-ai/aideon-desktop/issues/826)) ([90aaf10](https://github.com/aideon-ai/aideon-desktop/commit/90aaf10f8f12d874f2771f4b64ee54ce100800c6))


### Refactors

* **design-system:** tokenize hard-coded radius/size literals in primitives ([#432](https://github.com/aideon-ai/aideon-desktop/issues/432)) ([#818](https://github.com/aideon-ai/aideon-desktop/issues/818)) ([b6eb618](https://github.com/aideon-ai/aideon-desktop/commit/b6eb61820f3e02bf16fea5f8cb9175a84c7b5aa0))
* move app/ into src/app for a single source root ([#263](https://github.com/aideon-ai/aideon-desktop/issues/263)) ([1b05b01](https://github.com/aideon-ai/aideon-desktop/commit/1b05b0194594be16295f455998dbd521f04d529a))
* uplift CodeScene Code Health toward 9.99 (tracking) ([#813](https://github.com/aideon-ai/aideon-desktop/issues/813)) ([7f58c9e](https://github.com/aideon-ai/aideon-desktop/commit/7f58c9e3a457bfd7a5a8dfb371ae0d6b9a283365))


### Documentation

* add domain glossary, ADR-0008, and agent-skills configuration ([827582a](https://github.com/aideon-ai/aideon-desktop/commit/827582a4f98cbe38978dc4f4ea8ba0defe5b19c5))
* add Plateau / Roadmap / Transition / Plateau detection to glossary ([#267](https://github.com/aideon-ai/aideon-desktop/issues/267)) ([a1e154d](https://github.com/aideon-ai/aideon-desktop/commit/a1e154d9b73370421ac4c24531d74777095cc348))
* add Plateau, Roadmap, Transition, Plateau detection to glossary ([a1e154d](https://github.com/aideon-ai/aideon-desktop/commit/a1e154d9b73370421ac4c24531d74777095cc348))
* add Result state to glossary (defers to Doc Standard §9) ([#266](https://github.com/aideon-ai/aideon-desktop/issues/266)) ([81fe771](https://github.com/aideon-ai/aideon-desktop/commit/81fe771316cf67f0a43d7a8d64684ef4a029194f))
* add Result state to glossary (points to Documentation Standard §9) ([81fe771](https://github.com/aideon-ai/aideon-desktop/commit/81fe771316cf67f0a43d7a8d64684ef4a029194f))
* add Signal, Confidence, Integrity to glossary ([#265](https://github.com/aideon-ai/aideon-desktop/issues/265)) ([683c259](https://github.com/aideon-ai/aideon-desktop/commit/683c25983b43806b88489abad079c063fb51ef93))
* **adr:** reconcile design-token contract — DTCG source authoritative (ADR-0041, [#769](https://github.com/aideon-ai/aideon-desktop/issues/769)) ([#820](https://github.com/aideon-ai/aideon-desktop/issues/820)) ([c1ecbdd](https://github.com/aideon-ai/aideon-desktop/commit/c1ecbdd238b3026978fe75cbd27be03158fcda40))
* **agents:** GitHub Project as tracking source of truth ([#275](https://github.com/aideon-ai/aideon-desktop/issues/275)) ([7200fd9](https://github.com/aideon-ai/aideon-desktop/commit/7200fd9a6c7790d1e65b4c124e358279d8b783d0))
* align canonical docs with current stack and requirements ([#193](https://github.com/aideon-ai/aideon-desktop/issues/193)) ([5b3cb0a](https://github.com/aideon-ai/aideon-desktop/commit/5b3cb0afdaa6085c2e2379818f3a332bab75bcce))
* align contracts and module docs to CONTEXT.md vocabulary ([#242](https://github.com/aideon-ai/aideon-desktop/issues/242)) ([783f7d5](https://github.com/aideon-ai/aideon-desktop/commit/783f7d59be10ad3545f0a6c14109c2cb9c28c3e7))
* **architecture:** M0 storage spec + UX map + ADR-0037/38/39; delete storage prototype, hollow host glue ([#304](https://github.com/aideon-ai/aideon-desktop/issues/304)) ([b8a00d6](https://github.com/aideon-ai/aideon-desktop/commit/b8a00d695bf8d758ed06083533eb4162bde0caf1))
* **build-contracts:** golden journey as a per-milestone growing CI gate ([#353](https://github.com/aideon-ai/aideon-desktop/issues/353)) ([6958267](https://github.com/aideon-ai/aideon-desktop/commit/6958267f2e4b9edf6908e521b2c7eae5280bbe9f))
* **build-contracts:** milestone challenge-review pack + D1/D6 resolutions ([#327](https://github.com/aideon-ai/aideon-desktop/issues/327)) ([dfdd5c3](https://github.com/aideon-ai/aideon-desktop/commit/dfdd5c3ed97a695de5acdb270741bdbaa4098d74))
* **claude:** slim CLAUDE.md to a router (373→89 lines), point to canonical docs ([#334](https://github.com/aideon-ai/aideon-desktop/issues/334)) ([aaf8bea](https://github.com/aideon-ai/aideon-desktop/commit/aaf8bea28079dee52916812b041a543365f9655b))
* decompose corpus into per-topic files + module taxonomy ADRs ([#261](https://github.com/aideon-ai/aideon-desktop/issues/261)) ([c15ebef](https://github.com/aideon-ai/aideon-desktop/commit/c15ebefb31a4a6d25e244e4605d6f77876087a82))
* domain glossary, ADR-0008, and agent-skills configuration ([#235](https://github.com/aideon-ai/aideon-desktop/issues/235)) ([827582a](https://github.com/aideon-ai/aideon-desktop/commit/827582a4f98cbe38978dc4f4ea8ba0defe5b19c5))
* fix stale renderer layout refs (app/ + src/ -&gt; src/) ([3b947f8](https://github.com/aideon-ai/aideon-desktop/commit/3b947f8ae75027defd2368410ecf79b72822843f))
* fix stale renderer layout refs (app/ + src/ → src/) ([#264](https://github.com/aideon-ai/aideon-desktop/issues/264)) ([3b947f8](https://github.com/aideon-ai/aideon-desktop/commit/3b947f8ae75027defd2368410ecf79b72822843f))
* **m0:** build-status traceability table ([#315](https://github.com/aideon-ai/aideon-desktop/issues/315)) ([96f9af0](https://github.com/aideon-ai/aideon-desktop/commit/96f9af0b3ed160b6287811bc6218a3997f2dbe27))
* **M0:** Tier-1 per-window capability denial — one runtime proof + strict static parity ([#356](https://github.com/aideon-ai/aideon-desktop/issues/356)) ([1943aff](https://github.com/aideon-ai/aideon-desktop/commit/1943affe84af3feb59a1f00162ebb2ff4bc25d8c))
* **M1/M2:** seed-shape + readiness + interval-scope decisions (grill pack) ([#344](https://github.com/aideon-ai/aideon-desktop/issues/344)) ([8256451](https://github.com/aideon-ai/aideon-desktop/commit/8256451dfa4677ce0ce3148c7cca259d5d8bf5c8))
* **milestones:** fold design-system conformance per-milestone; mark M0 complete ([#822](https://github.com/aideon-ai/aideon-desktop/issues/822)) ([075057f](https://github.com/aideon-ai/aideon-desktop/commit/075057f772a4ae52246e21a148db0671690028d4))
* sync canonical docs with current stack ([5b3cb0a](https://github.com/aideon-ai/aideon-desktop/commit/5b3cb0afdaa6085c2e2379818f3a332bab75bcce))


### Build System

* **deps-dev:** bump @commitlint/config-conventional ([c0ff436](https://github.com/aideon-ai/aideon-desktop/commit/c0ff436b2fb3db14bc7a6005d0054930a37eda86))
* **deps-dev:** bump @commitlint/config-conventional from 20.5.3 to 21.0.2 ([#227](https://github.com/aideon-ai/aideon-desktop/issues/227)) ([c0ff436](https://github.com/aideon-ai/aideon-desktop/commit/c0ff436b2fb3db14bc7a6005d0054930a37eda86))
* **deps-dev:** bump @storybook/addon-themes from 0.0.0-pr-35110-sha-d663f060 to 10.4.6 ([#337](https://github.com/aideon-ai/aideon-desktop/issues/337)) ([3cae506](https://github.com/aideon-ai/aideon-desktop/commit/3cae50608e6a0639820c27db77cc6f9648408172))
* **deps-dev:** bump @types/node from 24.9.2 to 24.10.1 ([#185](https://github.com/aideon-ai/aideon-desktop/issues/185)) ([265f68f](https://github.com/aideon-ai/aideon-desktop/commit/265f68f2b1e3f84264a50534c50bafdbaf2ce171))
* **deps-dev:** bump @typescript-eslint/eslint-plugin from 8.63.0 to 8.64.0 ([#803](https://github.com/aideon-ai/aideon-desktop/issues/803)) ([57d6041](https://github.com/aideon-ai/aideon-desktop/commit/57d60412bc5c1cd0dab2acda1814367280bb9c7c))
* **deps-dev:** bump @wdio/cli from 9.29.0 to 9.29.1 ([#774](https://github.com/aideon-ai/aideon-desktop/issues/774)) ([925c0e5](https://github.com/aideon-ai/aideon-desktop/commit/925c0e519261e18b544ea347612965541f29c4e8))
* **deps-dev:** bump eslint from 9.39.4 to 10.7.0 ([#810](https://github.com/aideon-ai/aideon-desktop/issues/810)) ([b5967d4](https://github.com/aideon-ai/aideon-desktop/commit/b5967d41cb6296343ed4395fe01e9df3bd7376ef))
* **deps-dev:** bump eslint-plugin-jsdoc from 61.7.1 to 63.0.7 ([#340](https://github.com/aideon-ai/aideon-desktop/issues/340)) ([a855d75](https://github.com/aideon-ai/aideon-desktop/commit/a855d75ae69d8d5893bbe5b718fcea38b11be8dc))
* **deps-dev:** bump eslint-plugin-regexp from 2.10.0 to 3.1.0 ([#228](https://github.com/aideon-ai/aideon-desktop/issues/228)) ([d1a0e8f](https://github.com/aideon-ai/aideon-desktop/commit/d1a0e8fdff4d120d14a888043d91139e1126fd7b))
* **deps-dev:** bump eslint-plugin-sonarjs from 3.0.7 to 4.1.0 ([#299](https://github.com/aideon-ai/aideon-desktop/issues/299)) ([4c1c48a](https://github.com/aideon-ai/aideon-desktop/commit/4c1c48ad325ff1a6f5e3ecde35d849dd6de68729))
* **deps-dev:** bump eslint-plugin-unicorn from 62.0.0 to 65.0.1 ([#224](https://github.com/aideon-ai/aideon-desktop/issues/224)) ([863445a](https://github.com/aideon-ai/aideon-desktop/commit/863445a078a75f9cbea7023a67a90cfd4e80e202))
* **deps-dev:** bump prettier-plugin-tailwindcss from 0.7.4 to 0.8.0 ([#226](https://github.com/aideon-ai/aideon-desktop/issues/226)) ([96b8169](https://github.com/aideon-ai/aideon-desktop/commit/96b8169dee9a1db6a48439376377631918f0361d))
* **deps-dev:** bump tailwindcss from 4.1.17 to 4.3.0 ([f9b17ba](https://github.com/aideon-ai/aideon-desktop/commit/f9b17ba2bf8f312d445d8f3016e37a59c9a26d6c))
* **deps-dev:** bump typescript-eslint from 8.61.1 to 8.63.0 ([#775](https://github.com/aideon-ai/aideon-desktop/issues/775)) ([1f87f2a](https://github.com/aideon-ai/aideon-desktop/commit/1f87f2af9f646a1494998768e65259af31091850))
* **deps-dev:** bump typescript-eslint from 8.63.0 to 8.64.0 ([#801](https://github.com/aideon-ai/aideon-desktop/issues/801)) ([2954ecb](https://github.com/aideon-ai/aideon-desktop/commit/2954ecb59bec59cc7f2c753ab362b40ec96edd31))
* **deps-dev:** bump vite from 7.1.12 to 7.2.6 ([#186](https://github.com/aideon-ai/aideon-desktop/issues/186)) ([9960f3c](https://github.com/aideon-ai/aideon-desktop/commit/9960f3c6efe0dcd6e3e5fdd3051361657a7df319))
* **deps-dev:** bump vite from 7.3.0 to 7.3.2 in the npm_and_yarn group across 1 directory ([#285](https://github.com/aideon-ai/aideon-desktop/issues/285)) ([685b517](https://github.com/aideon-ai/aideon-desktop/commit/685b517d5f5332473e77d295bf5ef308ed04bb23))
* **deps-dev:** bump vite from 7.3.2 to 7.3.5 in the npm_and_yarn group across 1 directory ([#308](https://github.com/aideon-ai/aideon-desktop/issues/308)) ([2a7ad10](https://github.com/aideon-ai/aideon-desktop/commit/2a7ad10ad309e2e0937d22dc47908c4e4087852a))
* **deps:** bump @radix-ui/react-select from 2.3.0 to 2.3.1 ([#301](https://github.com/aideon-ai/aideon-desktop/issues/301)) ([c3531ec](https://github.com/aideon-ai/aideon-desktop/commit/c3531ec87be33a200d503da5410998b169932bed))
* **deps:** bump @xyflow/react from 12.11.0 to 12.11.1 ([#342](https://github.com/aideon-ai/aideon-desktop/issues/342)) ([bca55a1](https://github.com/aideon-ai/aideon-desktop/commit/bca55a17b744bb2f595f8a0f56f866456cc86163))
* **deps:** bump actions/cache from 4 to 5 ([#190](https://github.com/aideon-ai/aideon-desktop/issues/190)) ([6b59b9b](https://github.com/aideon-ai/aideon-desktop/commit/6b59b9bc4c7cc15877869092297d3a7c85a6853e))
* **deps:** bump actions/cache from 4 to 5 ([#294](https://github.com/aideon-ai/aideon-desktop/issues/294)) ([6978991](https://github.com/aideon-ai/aideon-desktop/commit/6978991d64def99deae13eafd47fa18f3f02b7c5))
* **deps:** bump actions/cache from 5 to 6 ([#363](https://github.com/aideon-ai/aideon-desktop/issues/363)) ([ebe9a96](https://github.com/aideon-ai/aideon-desktop/commit/ebe9a96096d9408b318ced1cecc8f23de5bf7212))
* **deps:** bump actions/checkout from 4 to 7 ([#799](https://github.com/aideon-ai/aideon-desktop/issues/799)) ([59ae5ed](https://github.com/aideon-ai/aideon-desktop/commit/59ae5ed311489f90a0fe4a4efab7f6a03b2c7972))
* **deps:** bump actions/checkout from 5 to 7 ([#333](https://github.com/aideon-ai/aideon-desktop/issues/333)) ([0d5ecb8](https://github.com/aideon-ai/aideon-desktop/commit/0d5ecb8e9adcbef2d7fb89066abb0b01ac0dcfa4))
* **deps:** bump actions/github-script from 7 to 9 ([#773](https://github.com/aideon-ai/aideon-desktop/issues/773)) ([4387c15](https://github.com/aideon-ai/aideon-desktop/commit/4387c15e236465b6adcc59621d63ba1531dd2f04))
* **deps:** bump actions/setup-node from 5 to 7 ([#800](https://github.com/aideon-ai/aideon-desktop/issues/800)) ([7dd70d6](https://github.com/aideon-ai/aideon-desktop/commit/7dd70d686d0740f11817dc6a9a3bbb7191b95bf9))
* **deps:** bump actions/upload-artifact from 4 to 7 ([#295](https://github.com/aideon-ai/aideon-desktop/issues/295)) ([ca6d7ad](https://github.com/aideon-ai/aideon-desktop/commit/ca6d7ad999e22f4280dfdf4ff93eba7bde8247f3))
* **deps:** bump actions/upload-artifact from 4 to 7 ([#772](https://github.com/aideon-ai/aideon-desktop/issues/772)) ([23b8b7f](https://github.com/aideon-ai/aideon-desktop/commit/23b8b7f612b51db69b807ee04970ba9847a22eb6))
* **deps:** bump actions/upload-artifact from 5 to 6 ([#192](https://github.com/aideon-ai/aideon-desktop/issues/192)) ([9435c70](https://github.com/aideon-ai/aideon-desktop/commit/9435c7013fd6626a12635a8c35d2e540d8ecffe6))
* **deps:** bump actions/upload-artifact from 6 to 7 ([4557152](https://github.com/aideon-ai/aideon-desktop/commit/45571529e260603147dbd7c132e8dc79e0eb310c))
* **deps:** bump anyhow from 1.0.102 to 1.0.103 ([#779](https://github.com/aideon-ai/aideon-desktop/issues/779)) ([20a1822](https://github.com/aideon-ai/aideon-desktop/commit/20a1822711a5cca04f4586a9f39142eed8bd164c))
* **deps:** bump apple-actions/import-codesign-certs from 2 to 7 ([e6f6f89](https://github.com/aideon-ai/aideon-desktop/commit/e6f6f89ed33df00bc0f4995c01a09f8f7ca0d3cf))
* **deps:** bump apple-actions/import-codesign-certs from 3 to 7 ([#296](https://github.com/aideon-ai/aideon-desktop/issues/296)) ([0a1c34b](https://github.com/aideon-ai/aideon-desktop/commit/0a1c34b3eab72e5b85b86bc588d149454ee28e09))
* **deps:** bump codacy/codacy-analysis-cli-action from 1.1.0 to 4.4.7 ([#798](https://github.com/aideon-ai/aideon-desktop/issues/798)) ([7237615](https://github.com/aideon-ai/aideon-desktop/commit/7237615a952fbdc654b00badac65a670c191b896))
* **deps:** bump github/codeql-action from 3 to 4 ([#297](https://github.com/aideon-ai/aideon-desktop/issues/297)) ([646cbdc](https://github.com/aideon-ai/aideon-desktop/commit/646cbdcb8b5ba6c99179a29f8ccfd34522d651ca))
* **deps:** bump github/codeql-action from 3 to 4 ([#797](https://github.com/aideon-ai/aideon-desktop/issues/797)) ([d32a7d1](https://github.com/aideon-ai/aideon-desktop/commit/d32a7d1faaafd6bfddafc525ed84ddd3ace8b23c))
* **deps:** bump googleapis/release-please-action from 4 to 5 ([#332](https://github.com/aideon-ai/aideon-desktop/issues/332)) ([1098ac4](https://github.com/aideon-ai/aideon-desktop/commit/1098ac436b09d4554d06cdc7594343e8778f1c87))
* **deps:** bump hmac from 0.12.1 to 0.13.0 ([#806](https://github.com/aideon-ai/aideon-desktop/issues/806)) ([1c82abd](https://github.com/aideon-ai/aideon-desktop/commit/1c82abd4a583accd3de503d53e5a2b16c0b84279))
* **deps:** bump pnpm/action-setup from 4 to 6 ([6cb6840](https://github.com/aideon-ai/aideon-desktop/commit/6cb6840216221728cb54649f15f0bc723b7a26e1))
* **deps:** bump pnpm/action-setup from 4 to 6 ([#293](https://github.com/aideon-ai/aideon-desktop/issues/293)) ([6e66d73](https://github.com/aideon-ai/aideon-desktop/commit/6e66d730def336ebe316ef894284890b8fa746d5))
* **deps:** bump rusqlite from 0.32.1 to 0.40.1 ([#338](https://github.com/aideon-ai/aideon-desktop/issues/338)) ([55a82a4](https://github.com/aideon-ai/aideon-desktop/commit/55a82a4d35129d7178c5ab1dbaeb74487ac5ae61))
* **deps:** bump sha2 from 0.10.9 to 0.11.0 ([#335](https://github.com/aideon-ai/aideon-desktop/issues/335)) ([2a8c262](https://github.com/aideon-ai/aideon-desktop/commit/2a8c262b98b9942b01eb7e86082d7a36c9211c61))
* **deps:** bump SonarSource/sonarqube-scan-action from 7 to 8 ([a6d5b1e](https://github.com/aideon-ai/aideon-desktop/commit/a6d5b1ee502c5ac924694ff320ac04e1593c50af))
* **deps:** bump tauri from 2.11.3 to 2.11.5 ([#778](https://github.com/aideon-ai/aideon-desktop/issues/778)) ([5ed87cb](https://github.com/aideon-ai/aideon-desktop/commit/5ed87cb13412cb38aa62fe37c4302626b3ae8cca))
* **deps:** bump tauri-plugin-log from 2.8.0 to 2.9.0 ([#805](https://github.com/aideon-ai/aideon-desktop/issues/805)) ([12c0742](https://github.com/aideon-ai/aideon-desktop/commit/12c0742b1f929e1b96e6cbd0edd9c85361bae891))
* **deps:** bump time from 0.3.47 to 0.3.49 ([#302](https://github.com/aideon-ai/aideon-desktop/issues/302)) ([d0da904](https://github.com/aideon-ai/aideon-desktop/commit/d0da904a4303b6daf490621117712880a9085c4d))
* **deps:** bump time from 0.3.49 to 0.3.51 ([#336](https://github.com/aideon-ai/aideon-desktop/issues/336)) ([464b136](https://github.com/aideon-ai/aideon-desktop/commit/464b1367f616cd400d3eb896c9a7f303836adf37))
* **deps:** bump time from 0.3.51 to 0.3.53 ([#777](https://github.com/aideon-ai/aideon-desktop/issues/777)) ([3c87fb2](https://github.com/aideon-ai/aideon-desktop/commit/3c87fb26d48beeb60a62d2bd9645cadbbc265cb2))
* **deps:** bump toml from 1.1.2+spec-1.1.0 to 1.1.3+spec-1.1.0 ([#804](https://github.com/aideon-ai/aideon-desktop/issues/804)) ([f6be955](https://github.com/aideon-ai/aideon-desktop/commit/f6be955c91b34cc336e88d2f2b7a93f00f68d11d))
* **deps:** bump uuid from 1.23.3 to 1.23.4 ([#776](https://github.com/aideon-ai/aideon-desktop/issues/776)) ([668aee8](https://github.com/aideon-ai/aideon-desktop/commit/668aee8448e2cc0b201c1511390accf36fb8007a))
* **deps:** bump uuid from 1.23.4 to 1.24.0 ([#808](https://github.com/aideon-ai/aideon-desktop/issues/808)) ([74c684d](https://github.com/aideon-ai/aideon-desktop/commit/74c684df990e6569e5784c5950c311a2084bd4ea))


### Continuous Integration

* cache hygiene — stable keys, drop redundant/mis-keyed cargo cache, enforce --locked ([#306](https://github.com/aideon-ai/aideon-desktop/issues/306)) ([0d47875](https://github.com/aideon-ai/aideon-desktop/commit/0d47875abfbf1ad91a74530bb699029b14e5aba6))
* **codacy:** fix SARIF upload — unique category per run ([#811](https://github.com/aideon-ai/aideon-desktop/issues/811)) ([00fb09c](https://github.com/aideon-ai/aideon-desktop/commit/00fb09cc6b8f2ff7cb12dc941d5b700b0908b42c))
* **codacy:** honour project-enabled analyzers (fix ~2k code-scanning noise) ([#812](https://github.com/aideon-ai/aideon-desktop/issues/812)) ([cb70308](https://github.com/aideon-ai/aideon-desktop/commit/cb703082168e13fe865df469ed4376be1da1e5fa))
* fix pipelines and add pre-commit autoformat ([#276](https://github.com/aideon-ai/aideon-desktop/issues/276)) ([ccdf662](https://github.com/aideon-ai/aideon-desktop/commit/ccdf662ccc2887a0e2779d0e55298966aa200562))
* PR-based releases via release-please (retire semantic-release) ([#305](https://github.com/aideon-ai/aideon-desktop/issues/305)) ([462b4a4](https://github.com/aideon-ai/aideon-desktop/commit/462b4a43f30c7e31e090a6e5df35cd74ea0cb2a3))

## Architecture note

• “Older entries mention preload/UDS/JSON-RPC. The current target desktop architecture is Tauri invoke IPC and in-process engines.”

## [0.2.0](https://github.com/fenrick/aideon-desktop/compare/v0.1.0...v0.2.0) (2025-12-17)

### Bug Fixes

- **app/dev:** use uv run with required deps for worker server\n\n- Add --with uvicorn/fastapi/pydantic for dev spawn to prevent ModuleNotFoundError during yarn dev\n- Packaged behavior unchanged ([670f78f](https://github.com/fenrick/aideon-desktop/commit/670f78f89d2bf96f1930ab966f61a3afec655e68))
- **app/main:** handle response error events and reject with Error instances; add test for inter-process RPC rejection ([ac23fd2](https://github.com/fenrick/aideon-desktop/commit/ac23fd27938c6925bb860c3eb7f29674d559a503))
- **app/splash:** remove unused seconds prop; use Geist Mono Local for loading copy ([3dfa529](https://github.com/fenrick/aideon-desktop/commit/3dfa529bf5569ab4cc8decc14d51ad338108f76c))
- **app:** type-safe IPC parsing with tests; satisfy ESLint rules; add parser unit tests ([2d57af4](https://github.com/fenrick/aideon-desktop/commit/2d57af438560d2ff3705058d6df89153754cab6d))
- **ci,issues,ts:** use worker:sync in CI; add issues split+dod; fix TS shim lint/typecheck (Refs [#95](https://github.com/fenrick/aideon-desktop/issues/95)) ([0c80901](https://github.com/fenrick/aideon-desktop/commit/0c80901d34f0e47f2a667fde65fa531c0f236e1f))
- **ci:** stabilize svelte typecheck pipeline ([05c8a5c](https://github.com/fenrick/aideon-desktop/commit/05c8a5cfc06683c54c223ecbe64de0efae3efe4b))
- **dev-server:** type middleware and format postbuild ([6c09cd5](https://github.com/fenrick/aideon-desktop/commit/6c09cd506efdd7966891f5d1a42c69138f5224e9))
- **format:** fix formatting ([223f9bf](https://github.com/fenrick/aideon-desktop/commit/223f9bfdce23467735057bef3f585c6292cd450a))
- **menu:** reliably dispatch Debug → Style Guide across platforms\n\n- Track actual MenuId via MenuIds state and compare in on_menu_event\n- Use id 'debug_styleguide' (no dots); store resolved id string\n- Log menu ids and handle action even if platform remaps ids ([81a9bff](https://github.com/fenrick/aideon-desktop/commit/81a9bffcd4fd653b541bd28b9677ef671f218625))
- **menus:** add better menu options ([f1c0b65](https://github.com/fenrick/aideon-desktop/commit/f1c0b65a59bf54108545764732c3aeb0f77f8f2a))
- **renderer:** ensure tauri bridge before stateAt; log menu events\n\n- +page.svelte: import tauri-shim on demand if aideon missing\n- Add root platform class for consistent token behavior\n- Rust: log menu events and specific actions; log in open_styleguide() ([5345b91](https://github.com/fenrick/aideon-desktop/commit/5345b91f8c803defbb566e517c5dbd538a9fda4b))
- **splash:** fix splash page ([931ffff](https://github.com/fenrick/aideon-desktop/commit/931ffff63c06d45fe38675b1081ae6f50d9beb35))
- **svelte:** routing ([f4b2938](https://github.com/fenrick/aideon-desktop/commit/f4b293895479b5e0ef4bd91bf5ee8460368f8d50))
- **tauri:** remove invalid security.capabilities from v2 config; simplify host builder (Refs [#95](https://github.com/fenrick/aideon-desktop/issues/95)) ([691442d](https://github.com/fenrick/aideon-desktop/commit/691442da0e5445fac065c59fbb2b13c627da8688))
- **theme:** platform toggle now drives --color-accent with distinct demo colors; convert internal state to ; reduce Svelte warnings\n\n- Style: map mac/win/linux to visible accent colors for demos\n- Refs: use in styleguide and inputs to silence non-reactive warnings\n- A11y: Tabs close control is keyboard-operable\n- Cleanup: remove unused splash selector\n\nNote: slot deprecation warnings remain; planning snippet migration separately. ([cd1c99e](https://github.com/fenrick/aideon-desktop/commit/cd1c99e07890c62dc6793086a7930ab8230ae5e6))
- **worker/cli:** satisfy pyright by narrowing json result before dict.get() ([6602173](https://github.com/fenrick/aideon-desktop/commit/660217346c8f318c6002f5c93835ac96932a27dc))
- **worker/cli:** silence IPC notifications ([2c7648f](https://github.com/fenrick/aideon-desktop/commit/2c7648f343a5c146e11ad2afc55a95a06fcb9572))
- **worker/lint:** import AsyncIterator from collections.abc (Refs [#95](https://github.com/fenrick/aideon-desktop/issues/95)) ([cd80dc4](https://github.com/fenrick/aideon-desktop/commit/cd80dc4e078d984e9790fc9956a29cc8cf480f02))
- **worker:** type-safe IPC and legacy param parsing; satisfy mypy and ruff (use collections.abc.Mapping) ([fc90c74](https://github.com/fenrick/aideon-desktop/commit/fc90c74121f61fd4e70ae32b9f07839cbeccca4c))

### Features

- **app:** make renderer mount coverage-safe (dynamic import + noop in tests); add vitest config for Svelte transform ([1571fd7](https://github.com/fenrick/aideon-desktop/commit/1571fd70bc0a7df272b69c42e90830a75894214d))
- **app:** Desktop mode uses in-process engines; no inter-process RPC. ([#25](https://github.com/fenrick/aideon-desktop/issues/25), [#62](https://github.com/fenrick/aideon-desktop/issues/62)) ([0a90f7b](https://github.com/fenrick/aideon-desktop/commit/0a90f7b113a4644922526830b05a9a6c8089f2ac))
- **debug:** add Style Guide window and Debug menu item\n\n- Tauri menu: add Debug > UI Style Guide\n- Windows: new open_styleguide() opens /styleguide route\n- App: platform toggle in /styleguide to preview mac/win/linux token effects\n- CSS: fix platform class scoping (:root.platform-\*) ([f9ca5ca](https://github.com/fenrick/aideon-desktop/commit/f9ca5cad44ca9b811a5e555672c1194651a325d4))
- **design-system M0:** tokens v1, core components, layout, styleguide\n\n- Tokens (roles/elevation/spacing) and themed root\n- Core components: Button, Field, TextField, Select, Checkbox, Radio, Switch\n- Primitives: Toolbar(+Button), Tooltip, Toast host, SplitPane\n- Adaptive registries already added (shapes/docs/editors) with tests\n- Styleguide route (/styleguide) to preview tokens and components\n- Refactor Titlebar/MainView to tokens; lint/typecheck/test green ([64b903e](https://github.com/fenrick/aideon-desktop/commit/64b903e6506613d9aa668f5e4de453d7a454491a))
- **desktop:** adopt sveltekit renderer with splash route ([f07c742](https://github.com/fenrick/aideon-desktop/commit/f07c742efeceba25f40cf38463eae75e8659b33e))
- **docs): add C4 DSL and CI rendering\n\n- Add Structurizr DSL under docs/c4 with System Context + Container\n- Add scripts/render-c4.sh for local export (Structurizr CLI + PlantUML)\n- Add GitHub Action job to export PlantUML and render PNG, upload as artifacts\n\ndocs(adr): accept RPC ADR and add adapter boundaries\n\n- Mark ADR-0002 (RPC protocol) as Accepted (2025-10-28)\n- Add ADR-0003 documenting Graph/Storage/Worker adapter boundaries\n\nchore(ci): fix CODEOWNERS for monorepo layout\n\n- Map /app, /crates, /docs and add catch-all\n\nchore(tauri:** standardize build command and minor formatting\n\n- Use pnpm filter for beforeBuildCommand\n- Minor formatting in windows.rs ([bdd1bf4](https://github.com/fenrick/aideon-desktop/commit/bdd1bf49f7cdbce53a1cd1edec0582b42c692801))
- **host:** add feature-detected Tauri invoke wrapper + unit test (Refs [#102](https://github.com/fenrick/aideon-desktop/issues/102), [#95](https://github.com/fenrick/aideon-desktop/issues/95)) ([a7f3337](https://github.com/fenrick/aideon-desktop/commit/a7f333703ed33ae2d45984f92572aff3d2d6d75c))
- **host:** bootstrap minimal Tauri app + renderer shim; add dev/build scripts (Refs [#96](https://github.com/fenrick/aideon-desktop/issues/96), [#95](https://github.com/fenrick/aideon-desktop/issues/95)) ([68c89e2](https://github.com/fenrick/aideon-desktop/commit/68c89e29ddb671e03f3d2572aef503df3f5154b4))
- **host:** embed rust temporal engine and workspace ([d47a314](https://github.com/fenrick/aideon-desktop/commit/d47a3140792a5a86a3a6b4eb2f90f53fd4f36330))
- **host:** modularize tauri host ([78b3a3b](https://github.com/fenrick/aideon-desktop/commit/78b3a3b0d59d7f8a5d8044fc4761e6664870afd9))
- **logging:** broaden renderer and host observability ([5bc79a2](https://github.com/fenrick/aideon-desktop/commit/5bc79a2c82e5fd9365fe53a277646d8a2754165c))
- **logging:** enrich telemetry and stabilize type tooling ([18b549b](https://github.com/fenrick/aideon-desktop/commit/18b549b4ab2446d8014c6d3a09e1315755dcb25b))
- **m1:** Praxis canvas foundations + Sonar/coverage hardening ([#137](https://github.com/fenrick/aideon-desktop/issues/137)) ([082ce46](https://github.com/fenrick/aideon-desktop/commit/082ce467fd66540b2886816dfacb918979825b3f))
- **rpc:** selectively restore IPC changes from 12209b6 (exclude generated .aideon and docs/issues) ([4a79840](https://github.com/fenrick/aideon-desktop/commit/4a79840e38fad83688cf5ff2f0f99b73d85241d7))
- **ui:** introduce adaptive layer primitives\n\n- Tokens: add CSS design tokens and wire to theme\n- UI primitives: Tabs (multi-document), Modal (accessible skeleton)\n- Registries: shapes, documents, property editors (extensible) with tests\n\nstyle: normalize naming for lint rules; tests cover registries ([0192e5c](https://github.com/fenrick/aideon-desktop/commit/0192e5c8e64080276475e6a34e904b12cb7a2f41))
- **ui:** platform-aware design system parity (Windows/macOS/Neutral)\n\n- Add theme manager and OS preview; inject Fluent/Puppertino/Tailwind on demand\n- Wrap Button, TextField, Select, Checkbox, Radio, Switch, ToolbarButton, Tooltip, Modal\n- Style Guide: platform toggle reactive; remove unused selectors; fix a11y/events\n- Tests: ensure Tailwind only loads for Neutral; platform class toggles\n\nRefs: M0 foundations, prepares M1 MVP UI ([449f3d6](https://github.com/fenrick/aideon-desktop/commit/449f3d63de83eb33fab71b4ee1853c537408a89f))
- **worker): add /health endpoint; feat(app): use health check for readiness; ci(sonar:** wait for Quality Gate; docs: add 80% coverage gates to AGENTS.md and reference branch for new code ([de5da2b](https://github.com/fenrick/aideon-desktop/commit/de5da2b9bd5ff1ed55ad011e952b810d8163b40d))
- **worker:** add server and remove CLI; Desktop mode uses in-process engines; no inter-process RPC. (Refs [#95](https://github.com/fenrick/aideon-desktop/issues/95)) ([2329521](https://github.com/fenrick/aideon-desktop/commit/2329521cb84819eab990bc466e8e3bfd002abd56))

## [0.1.0](https://github.com/fenrick/aideon-praxis/compare/v0.0.0...v0.1.0) (2025-10-18)

### Bug Fixes

- **app:** rename catch binding; export AideonApi from global types to avoid bare export ([b981a7a](https://github.com/fenrick/aideon-praxis/commit/b981a7a782382e847e24eb5f187b621929a335d0))
- **app:** resolve ESLint issues (prefer globalThis, typed bridge, event-based ready, remove unnecessary conditions) ([0598ea2](https://github.com/fenrick/aideon-praxis/commit/0598ea21755d9cfc912729e9e2acc8a5cd395b3e))
- **app:** solidify global typings with module augmentation; use typed bridge access; update tests for require-await ([31b2de1](https://github.com/fenrick/aideon-praxis/commit/31b2de17e93c38d727104e74c5fc66ff538b407f))
- **dev:** wait for renderer index.html before launching Electron; add wait-on to coordinate dev watch builds ([b61392d](https://github.com/fenrick/aideon-praxis/commit/b61392db961421f8a17740dddc0fe77d8cacc249))
- **ipc:** register worker IPC handlers before readiness; await READY internally to avoid 'No handler registered' race ([51c1709](https://github.com/fenrick/aideon-praxis/commit/51c1709a752dc1d5e5411bad3fbe291708493748))
- **lint:** reduce main() complexity, remove fs loop, use helper for spawn; rename variables to satisfy rules; add vite/client types ([239ea8b](https://github.com/fenrick/aideon-praxis/commit/239ea8b866e729c8afa644ed5372a7ef3c8bc615))
- **renderer:** set Vite base='./' so built assets load via file:// in Electron ([2ae8828](https://github.com/fenrick/aideon-praxis/commit/2ae882836eb515327b8ce5fa787add86db98be17))

### Features

- **adapters:** add adapter interfaces and unit test ([2a4a814](https://github.com/fenrick/aideon-praxis/commit/2a4a8146bce8357fba130f2b5c980f6edafb2e78))
- **app:** expose typed stateAt; Renderer calls Host via Tauri invoke (typed adapters). ([ebc9948](https://github.com/fenrick/aideon-praxis/commit/ebc994838d6674c1b753eead7204142091890efe))
- **app:** scaffold secure Electron host + React renderer with packaging ([fec07a4](https://github.com/fenrick/aideon-praxis/commit/fec07a442af9c4888b8090e71eaf48c2e7687410))
- **e2e:** wire renderer↔host↔engines roundtrip; Renderer calls Host via Tauri invoke (typed adapters). Desktop mode runs engines in-process. Host calls engines via Rust traits. No sockets. ([1ce514e](https://github.com/fenrick/aideon-praxis/commit/1ce514e19cfd183a67966f862ca2bbef337b0c94))
- **worker:** add Python sidecar with `temporal_state_at` (legacy naming: `Temporal.StateAt`) and CLI ([1facad5](https://github.com/fenrick/aideon-praxis/commit/1facad5388ad795257fa65a21340b39f60288074))

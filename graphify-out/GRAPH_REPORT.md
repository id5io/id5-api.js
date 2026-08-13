# Graph Report - .  (2026-08-13)

## Corpus Check
- 179 files · ~98,917 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1464 nodes · 2779 edges · 172 communities (63 shown, 109 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.75)
- Token cost: 302,528 input · 0 output

## Community Hubs (Navigation)
- Consent Provider & CMP Detection
- GPP Consent Clients & Events Tracker
- Diagnostics Meters (Counter/Timer/Summary)
- Multiplexing Registry & API Test Utils
- Test Bootstrap & Mock Fetch Helpers
- Multiplexing/Diagnostics Package Deps
- Lite API & Integration Test Pages
- Watchdog, Extensions & Bounce/LBS
- Package Dev Tooling (test/lint)
- Core ID5 Instance Lifecycle
- API Standard & Diagnostics Config
- Targeting Tags & Ajax Utils
- Config & Page-Level Metrics
- Multiplexing Events & Election State
- Client Store (Response/Signature Cache)
- API Entry Points & Referer Detection
- Consent Management & Storage Config
- Cached User ID & Leader Properties
- Local & Replicating Storage
- Cross-Instance Messaging Protocol
- Package Dev Tooling (karma/build)
- Multiplexing Instance & Logger
- Id5Instance Public API
- Consent Management & TrueLink Adapter
- Package Dev Tooling (babel/gulp)
- Follower & Local Storage Fallback
- Multiplexing Instance Election Handling
- Actual Leader Refresh Handling
- GPP TCF Data & Fetch Test Fixtures
- Fetch & General Utils
- Cross-Instance Messenger
- Follower Interface
- Diagnostics Package Metadata
- Prebid Analytics Release Notes
- Universal ID Flow Diagram
- Gulp Build Pipeline
- Instance & Fetch Metrics Timers
- Refreshed Response Test Fixtures
- Storage API Abstraction
- UA Hints & GPP Consent Parsing
- Multiplexing Instance Stub
- Core Module Exports
- Election State & Instance Counters
- Awaited Leader
- Multiplexing Integration Test Pages
- Lazy Value Promise Wrapper
- Cached Response Freshness
- Consent Data Model
- Discovered Instance
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 163
- Community 168
- Community 169
- Community 170
- Community 171

## God Nodes (most connected - your core abstractions)
1. `ClientStore` - 33 edges
2. `MeterRegistry` - 26 edges
3. `NO_OP_LOGGER` - 26 edges
4. `ConsentDataProvider` - 22 edges
5. `ConsentData` - 22 edges
6. `ActualLeader` - 22 edges
7. `Follower` - 21 edges
8. `CoreId5Instance` - 20 edges
9. `Id5Instance` - 20 edges
10. `LocalStorage` - 20 edges

## Surprising Connections (you probably didn't know these)
- `ID5.initLite() method` --semantically_similar_to--> `ID5.init() method`  [INFERRED] [semantically similar]
  docs/api-lite/README.md → README.md
- `id5Instance.getUserId() (Lite)` --semantically_similar_to--> `id5Instance.getUserId() method`  [INFERRED] [semantically similar]
  docs/api-lite/README.md → README.md
- `Bug fix: enhanced multiplexing message handling (v1.0.77)` --semantically_similar_to--> `mxInstance.on('leader-elected') handler (index)`  [INFERRED] [semantically similar]
  release_notes/v1.0.77.md → integration/resources/multiplexing/index.html
- `convertPartnerDataToPd()` --calls--> `isDefined()`  [EXTRACTED]
  lib/partnerDataConfig.js → packages/multiplexing/src/utils.js
- `ID5 API Lite (reduced-functionality API)` --conceptually_related_to--> `ID5 API (client library)`  [INFERRED]
  docs/api-lite/README.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Google signal-sharing (ESP / GSS) integration test surface** — integration_resources_esp, integration_resources_esp_no_config, integration_resources_gss, readme_gssprovider [INFERRED 0.75]
- **Prebid module fetchId5Id integration flow** — readme_prebidjs, integration_resources_prebidmodule_integration, integration_resources_prebidmodule_lookupmodeintegration, integration_resources_prebidmodule_integration_fetchid5id [EXTRACTED 0.90]
- **README-documented config options each exercised by a dedicated integration test page** — integration_resources_creativerestrictions, integration_resources_diagnostics, integration_resources_idlookupmode, integration_resources_partnerdata, readme_id5_init [INFERRED 0.85]
- **Multiplexing Leader-Election Test Harness Pattern** — integration_resources_multiplexing_index_latejoiner_refresh_leaderelectedhandler, integration_resources_multiplexing_index_latejoiner_leaderelectedhandler, integration_resources_multiplexing_index_single_leaderelectedhandler, integration_resources_multiplexing_index_singleton_leaderelectedhandler, integration_resources_multiplexing_index_leaderelectedhandler, integration_resources_multiplexing_multiple_integrations_leaderelectedhandler1, integration_resources_multiplexing_single_integration_leaderelectedhandler [INFERRED 0.85]
- **ID5 onAvailable Callback Display Pattern** — test_pages_basic_id5callback, test_pages_consentmanager_id5callback, test_pages_static_consent_id5callback [INFERRED 0.85]
- **Prebid Module Integration Evolution** — release_notes_v1_0_77_cancookiesync_prebid_config, release_notes_v1_0_79_prebid_pass_whole_response, release_notes_v1_0_80_prebid_diagnostic_metrics_fix [INFERRED 0.85]
- **Prebid analytics events collection & efficiency flow (v1.0.87-v1.0.94)** — release_notes_v1_0_87_prebid_external_module_fix, release_notes_v1_0_90_prebid_events_collection, release_notes_v1_0_91_event_payload_size_reduction, release_notes_v1_0_92_ortb2_user_support, release_notes_v1_0_93_ad_rendered_events, release_notes_v1_0_93_gzip_analytics_events, release_notes_v1_0_94_prebid_integration_metrics [INFERRED 0.80]
- **ID5 signature exposure and local storage key migration** — release_notes_v1_0_86_signature_method, release_notes_v1_0_88_id5id_key_removed, release_notes_v1_0_88_id5id_v2_signature_key [INFERRED 0.85]
- **Exposing ID5 ID / targeting to external ad-tech systems** — release_notes_v1_0_89_google_secure_signals, release_notes_v1_0_95_gamtargetingprefix, release_notes_v1_0_95_exposetargeting [INFERRED 0.75]

## Communities (172 total, 109 thin omitted)

### Community 0 - "Consent Provider & CMP Detection"
Cohesion: 0.05
Nodes (34): logTypeError(), addApiData(), CALLBACK_POSITIONS, ConsentDataProvider, SURROGATE_CONFIG, consentDiscrepancyCounter(), convertPartnerDataToPd(), isSha256Hash() (+26 more)

### Community 1 - "GPP Consent Clients & Events Tracker"
Cohesion: 0.06
Nodes (31): GPPClient, GppClientV10, GppClientV11, copyAdRenderSucceeded(), copyAuctionEnd(), copyBid(), copyBidderRequest(), copyBidWon() (+23 more)

### Community 2 - "Diagnostics Meters (Counter/Timer/Summary)"
Cohesion: 0.05
Nodes (14): Counter, Meter, MeterType, Summary, TimeMeasurement, Timer, IS_PUBLISHING_SUPPORTED, MeasurementsPublisher (+6 more)

### Community 3 - "Multiplexing Registry & API Test Utils"
Cohesion: 0.07
Nodes (36): multiplexing, MultiplexingRegistry, utils, findLsgCounter(), localStorageGrantNotAllowedCounterValue(), lsgCounterTag(), CALLBACK_TIMEOUT_MS, clearMockedConsent() (+28 more)

### Community 4 - "Test Bootstrap & Mock Fetch Helpers"
Cohesion: 0.07
Nodes (38): _DEBUG, expectMultiFetchRequests(), expectRequestAt(), expectRequestsAt(), ID5_API_JS_FILE, ID5_API_JS_LITE_FILE, ID5_ESP_JS_FILE, MOCK_CORS_ALLOW_ALL_HEADERS (+30 more)

### Community 5 - "Multiplexing/Diagnostics Package Deps"
Cohesion: 0.05
Nodes (43): @babel/runtime, @id5io/multiplexing, author, browser, bugs, url, dependencies, @babel/runtime (+35 more)

### Community 6 - "Lite API & Integration Test Pages"
Cohesion: 0.07
Nodes (35): id5Instance.getUserId() (Lite), gssProvider configuration (Lite), ID5.initLite() method, segments configuration (Lite), Creative restrictions integration test page, Diagnostics publishing integration test page, Diagnostics publish-on-unload integration test page, Google ESP integration test page (with config) (+27 more)

### Community 7 - "Watchdog, Extensions & Bounce/LBS"
Cohesion: 0.09
Nodes (9): WatchdogSingletonCallback, startTimeMeasurement(), Extensions, ID5_BOUNCE_ENDPOINT, ID5_LB_ENDPOINT, ID5_LBS_ENDPOINT, extensionsCallTimer(), Store (+1 more)

### Community 8 - "Package Dev Tooling (test/lint)"
Cohesion: 0.06
Nodes (35): author, description, devDependencies, chai, eslint, gulp, gulp-eslint-new, mocha (+27 more)

### Community 9 - "Core ID5 Instance Lifecycle"
Cohesion: 0.09
Nodes (8): CoreId5Instance, Id5InstanceFinalizationRegistry, StrongRef, UnregisterTargets, instanceSurvivalTime(), isDefined, isFn, isGlobalTrace()

### Community 10 - "API Standard & Diagnostics Config"
Cohesion: 0.12
Nodes (11): ApiStandard, checkPbjsId5Integrations(), API_STANDARD_ORIGIN, invocationCountSummary(), loadDelayTimer(), partnerTag(), pbjsDetectedCounter(), isFencedFrame() (+3 more)

### Community 11 - "Targeting Tags & Ajax Utils"
Cohesion: 0.11
Nodes (18): ID5, TargetingTags, ajax(), ajaxLogger, all(), consoleExists, deepEqual(), deepEqualArrays() (+10 more)

### Community 12 - "Config & Page-Level Metrics"
Cohesion: 0.20
Nodes (12): Config, ENUM_PROPERTIES, GCReclaimAllowed, ID5_REGISTRY, PageLevelInfo, Id5CommonMetrics, userIdNotificationDeliveryDelayTimer(), userIdProvisioningDelayTimer() (+4 more)

### Community 13 - "Multiplexing Events & Election State"
Cohesion: 0.15
Nodes (11): ApiEventsDispatcher, MultiplexingEvent, SUPPORTED_EVENTS, electLeader(), UniqCounter, ElectionState, OperatingMode, Role (+3 more)

### Community 15 - "API Entry Points & Referer Detection"
Cohesion: 0.13
Nodes (11): Id5Api, ID5, ApiLite, API_LITE_ORIGIN, Id5InstanceLite, detectReferer(), getRefererInfo, isGlobalDebug() (+3 more)

### Community 16 - "Consent Management & Storage Config"
Cohesion: 0.18
Nodes (10): API_TYPE, GRANT_TYPE, LocalStorageGrant, CONSTANTS, StorageConfig, StoreItemConfig, isNumber(), DEFAULT_STORAGE_CONFIG (+2 more)

### Community 17 - "Cached User ID & Leader Properties"
Cohesion: 0.12
Nodes (10): CachedUserIdProvisioner, ConsentSource, Properties, AddFollowerResult, Leader, cachedUserIdAge(), expectedFollowerData(), expectedFollowerPassiveData() (+2 more)

### Community 18 - "Local & Replicating Storage"
Cohesion: 0.15
Nodes (3): isExpired(), LocalStorage, ReplicatingStorage

### Community 19 - "Cross-Instance Messaging Protocol"
Cohesion: 0.13
Nodes (7): HelloMessage, Id5Message, Id5MessageFactory, ProxyMethodCallHandler, ProxyMethodCallMessage, ProxyMethodCallTarget, Hello

### Community 20 - "Package Dev Tooling (karma/build)"
Cohesion: 0.10
Nodes (21): karma-sourcemap-loader, devDependencies, chrome-paths, genversion, karma-chai, karma-chrome-launcher, karma-mocha, karma-sourcemap-loader (+13 more)

### Community 21 - "Multiplexing Instance & Logger"
Cohesion: 0.17
Nodes (3): MultiplexingInstance, MultiplexingLogger, instanceMsgDeliveryTimer()

### Community 22 - "Id5Instance Public API"
Cohesion: 0.15
Nodes (3): Id5Instance, consentRequestTimer(), refreshCallCounter()

### Community 23 - "Consent Management & TrueLink Adapter"
Cohesion: 0.15
Nodes (4): ConsentManagement, localStorageGrantCounter(), TrueLinkAdapter, isPlainObject()

### Community 24 - "Package Dev Tooling (babel/gulp)"
Cohesion: 0.12
Nodes (17): @babel/core, @babel/plugin-transform-object-assign, gulp-header, gulp-shell, is-docker, istanbul, devDependencies, @babel/core (+9 more)

### Community 25 - "Follower & Local Storage Fallback"
Cohesion: 0.25
Nodes (7): DirectFollower, FollowerCallType, FollowerType, NoopStorage, NO_OP_LOGGER, userIdProvisioningDuplicateTimer(), properties

### Community 26 - "Multiplexing Instance Election Handling"
Cohesion: 0.15
Nodes (5): Instance, instanceJoinDelayTimer(), instanceLastJoinDelayTimer(), instanceLateJoinCounter(), instanceLateJoinDelayTimer()

### Community 28 - "GPP TCF Data & Fetch Test Fixtures"
Cohesion: 0.12
Nodes (6): GppTcfData, CONSENT_DATA_GDPR_ALLOWED, DEFAULT_EXTENSIONS, DEFAULT_FETCH_DATA, FETCH_RESPONSE_OBJ, PRIVACY_DATA_RETURNED

### Community 29 - "Fetch & General Utils"
Cohesion: 0.27
Nodes (14): ajax(), cyrb53Hash(), _each(), format(), formatQS(), generateId(), isA(), isArray() (+6 more)

### Community 32 - "Diagnostics Package Metadata"
Cohesion: 0.14
Nodes (13): author, dependencies, @id5io/diagnostics, description, engines, node, @id5io/diagnostics, keywords (+5 more)

### Community 33 - "Prebid Analytics Release Notes"
Cohesion: 0.15
Nodes (14): Release v1.0.87, Prebid external module version collection fix, Release v1.0.90, Enable prebid events collecting without id5Analytics module, Release v1.0.91, Reduced collected event payload size, Release v1.0.92, Support for ortb2.user and userIdAsEids in auctionEnd analytics events (+6 more)

### Community 34 - "Universal ID Flow Diagram"
Cohesion: 0.19
Nodes (14): CMP (Consent Management Platform), ID5 API, ID5 (identity resolution service), Platform1, Platform2, Publisher, Step 1: User visits Publisher who captures consent preferences, Step 2: Request the ID5 ID (if not cached) (+6 more)

### Community 35 - "Gulp Build Pipeline"
Cohesion: 0.27
Nodes (11): buildRollupBaseStream(), buildRollupTransformer(), bundleDev(), bundleProd(), bundles, id5Api, isNotMap(), lint() (+3 more)

### Community 36 - "Instance & Fetch Metrics Timers"
Cohesion: 0.23
Nodes (10): fetchCallTimer(), fetchFailureCallTimer(), fetchSuccessfulCallTimer(), instanceCounter(), instanceUniqPartnersCounter(), instanceUniqueDomainsCounter(), instanceUniqWindowsCounter(), refreshCallCounter() (+2 more)

### Community 37 - "Refreshed Response Test Fixtures"
Cohesion: 0.18
Nodes (7): RefreshedResponse, CONSENT_DATA, daysToMs(), FETCH_ID_DATA, FETCH_RESPONSE_OBJ, hoursToMs(), hoursToSec()

### Community 39 - "UA Hints & GPP Consent Parsing"
Cohesion: 0.24
Nodes (3): _getApiTypesFromOldVersion(), GppConsentData, isDefined()

### Community 41 - "Core Module Exports"
Cohesion: 0.20
Nodes (10): exports, ./consent, ./constants, ./core, ./events, ./lite, ./logger, ./store (+2 more)

### Community 42 - "Election State & Instance Counters"
Cohesion: 0.29
Nodes (3): collectPartySizeMetrics(), Election, InstancesCounters

### Community 44 - "Multiplexing Integration Test Pages"
Cohesion: 0.25
Nodes (9): ID5.init call (default multiplexing enabled, single integration index), mxInstance.on('leader-elected') handler (index), ID5.init call with multiplexing._disabled true (singleton test), mxInstance.on('leader-elected') handler (singleton), ID5.init call (single-integration test), mxInstance.on('leader-elected') handler (single-integration), Bug fix: enhanced multiplexing message handling (v1.0.77), id5Callback function (renders UID + link type into placeholder div) (+1 more)

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (3): multiplexing, MultiplexingRegistry, PassiveMultiplexingInstance

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (6): addAssets(), createRelease(), fail(), isTagPresent(), publishRelease(), release-github.sh script

### Community 54 - "Community 54"
Cohesion: 0.62
Nodes (5): fail(), has_changed(), release-prepare.sh script, update_dependency(), update_workspace_package_version()

### Community 55 - "Community 55"
Cohesion: 0.47
Nodes (6): build job (npm ci, gulp-cli, build:all), github_release job, gitlab_release job, npm_release job, prepare_release job, Rationale: releases gated behind manual trigger and semver-tag regex to avoid accidental publishing

### Community 59 - "Community 59"
Cohesion: 0.40
Nodes (5): scripts, build, lint, npm_prepare_release, test

### Community 63 - "Community 63"
Cohesion: 0.50
Nodes (5): Consent for ID5 check before fetch call (v1.0.75), Enhanced parsing for GPP consent (flexible PurposeConsent/VendorConsent formats, Vendor ID string/number) (v1.0.76), Timeout on waiting for GPP CMP API to start loading, fallback to stub response (v1.0.77), Collect metrics on GPP Canada TCF consent (v1.0.78), Treat GPP consent objects without any consent flags as invalid, fallback to server-side parsing (v1.0.78)

### Community 64 - "Community 64"
Cohesion: 0.50
Nodes (5): Release v1.0.86, Signature method exposed on ID5 instance, Release v1.0.88, Removed old local storage key id5id, Added local storage key id5id_v2_signature

### Community 65 - "Community 65"
Cohesion: 0.50
Nodes (5): Release v1.0.89, Sharing ID5 ID via Google Secure Signals, Release v1.0.95, exposeTargeting option via window.id5tags, gamTargetingPrefix option for GAM pubads targeting

### Community 66 - "Community 66"
Cohesion: 0.40
Nodes (5): id5Callback function (renders UID + link type into placeholder div), ID5.init({partnerId:173,refreshInSeconds:15}) call (basic test page), Quantcast/ConsentManager CMP stub script (__cmp/__tcfapi/__uspapi stubs), id5Callback function (renders UID + link type into placeholder div), ID5.init({partnerId:173,refreshInSeconds:15}) call (consentmanager test page)

### Community 67 - "Community 67"
Cohesion: 0.50
Nodes (3): plugins, presets, @babel/plugin-transform-object-assign

### Community 68 - "Community 68"
Cohesion: 0.50
Nodes (4): ID5.init call (late-joiner test, partnerId 99, segments), mxInstance.on('leader-elected') handler (late-joiner), ID5.init call (late-joiner refresh test, partnerId 100, pd LATE_JOINER_PD), mxInstance.on('leader-elected') handler (late-joiner refresh)

### Community 69 - "Community 69"
Cohesion: 0.50
Nodes (4): ID5.init call #1 (partnerId 99, multiple integrations test), ID5.init call #2 (partnerId 98, multiple integrations test), mxInstance1.on('leader-elected') handler, mxInstance2.on('leader-elected') handler

### Community 72 - "Community 72"
Cohesion: 0.50
Nodes (4): files, src/*.js, generated/*.js, index*.mjs

### Community 75 - "Community 75"
Cohesion: 0.50
Nodes (4): Release v1.0.84, LBS extension enabled, Release v1.0.85, LBS extension call timeout fix

### Community 76 - "Community 76"
Cohesion: 1.00
Nodes (3): ID5.refreshId() integration test page, id5Instance.onRefresh() event listener, ID5.refreshId() method

### Community 78 - "Community 78"
Cohesion: 0.67
Nodes (3): Automated release process (v1.0.72), Include generated directory in automated release (v1.0.73), npm release process improvements; missing generated/version.js files added (v1.0.74)

### Community 79 - "Community 79"
Cohesion: 1.00
Nodes (3): Support for canCookieSync config in external Prebid module (v1.0.77), Prebid module: pass whole response object to Prebid (GpId, PublisherTrueLinkId fix) (v1.0.79), Prebid module: fix diagnostic metrics publisher (v1.0.80)

### Community 80 - "Community 80"
Cohesion: 1.00
Nodes (3): Release v1.0.97, PARTNER_DATA_KEYS exported constants, partnerData option (semantic-key partner data map)

## Ambiguous Edges - Review These
- `Non-friendly iframe content test page` → `Non-friendly iframe top-level test page`  [AMBIGUOUS]
  integration/resources/nonFriendlyIframeTop.html · relation: references

## Knowledge Gaps
- **302 isolated node(s):** `presets`, `@babel/plugin-transform-object-assign`, `id5Api`, `bundles`, `_DEBUG` (+297 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **109 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Non-friendly iframe content test page` and `Non-friendly iframe top-level test page`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `ClientStore` connect `Client Store (Response/Signature Cache)` to `Multiplexing Registry & API Test Utils`, `Instance & Fetch Metrics Timers`, `Refreshed Response Test Fixtures`, `API Standard & Diagnostics Config`, `Multiplexing Events & Election State`, `Consent Management & Storage Config`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Id5Instance` connect `Id5Instance Public API` to `Core ID5 Instance Lifecycle`, `API Standard & Diagnostics Config`, `Config & Page-Level Metrics`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Instance` connect `Multiplexing Instance Election Handling` to `Actual Leader Refresh Handling`, `Election State & Instance Counters`, `Multiplexing Registry & API Test Utils`, `Multiplexing Events & Election State`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `presets`, `@babel/plugin-transform-object-assign`, `id5Api` to the rest of the system?**
  _302 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Consent Provider & CMP Detection` be split into smaller, more focused modules?**
  _Cohesion score 0.054987212276214836 - nodes in this community are weakly interconnected._
- **Should `GPP Consent Clients & Events Tracker` be split into smaller, more focused modules?**
  _Cohesion score 0.05641025641025641 - nodes in this community are weakly interconnected._
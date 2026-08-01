/**
 * Licensed under CC BY-SA 4.0 — see LICENSE-TAXONOMY and ATTRIBUTION.md in the repo root.
 * SDK code outside this file is Apache-2.0 — see LICENSE.
 */

/**
 * intentLM Global Intent Taxonomy
 *
 * Token IDs are STABLE and shared across ALL customers.
 * Token 102 always means PRICING_VIEW regardless of which customer's app fires it.
 *
 * ─── Core product namespaces (client-side, URL pattern matching) ──────────────
 *   100–199   Navigation & Discovery
 *   200–299   Purchase Intent
 *   300–399   Friction & Abandonment
 *   400–499   Churn Risk
 *   500–599   Expansion & Upsell
 *   600–699   Onboarding
 *   700–799   Support & Help
 *   800–899   Product Usage
 *   900–999   Behavioral Signals
 *
 * ─── Security namespaces (server-side ONLY, never URL pattern mapped) ─────────
 *   1001–1099 Security — Auth Events
 *   1101–1199 Security — Data Access
 *   1201–1299 Security — Privileged Actions
 *   1301–1399 Security — Error / Probe Signals
 *   1401–1449 Security — Account Modification
 *   1450–1469 Security — Adversarial Agent Signals (server-side / agent bridge only)
 *
 * ─── Marketplace namespaces (server-side, marketplace platforms only) ─────────
 *   1501–1529 Marketplace — Provider Lifecycle
 *   1530–1559 Marketplace — Cross-side Signals
 *
 * ─── Developer Intelligence namespaces (IDE ext / CLI / GitHub App / obs hook) ─
 *   1601–1619 Developer — IDE Search Signals
 *   1620–1649 Developer — File & Code Navigation
 *   1650–1699 Developer — SRE & Incident (CLI + observability platform)
 *   1700–1749 Developer — GitHub Issue Triage
 *   1750–1799 Developer — Codebase Exploration & Performance
 *   1800–1899 Developer — Reserved (Slack, Linear, Jira, internal wiki)
 *   1900–1999 Developer — Behavioral Signals (auto-detected, no explicit mapping)
 *
 * ─── Industry Vertical namespaces (RESERVED — do not assign) ─────────────────
 *   2000–2999 Finance & Fintech
 *   3000–3999 Healthcare & Life Sciences
 *   4000–4999 Legal & Compliance
 *   5000–5999 Education & EdTech
 *   6000–6999 Real Estate & PropTech
 *   7000–7999 Manufacturing & Supply Chain
 *   8000–8999 Government & Public Sector
 *   9000–9999 Reserved for future verticals
 *
 * ─── Assignment rules ────────────────────────────────────────────────────────
 *  • 100–999   client-side URL/event pattern matching; safe in browser SDK
 *  • 1000–1999 mixed — see per-namespace comments; security (1001–1499) MUST be
 *              server-side only; developer (1600–1999) fired by IDE/CLI/GitHub App
 *  • 2000+     RESERVED for industry verticals — never assign ad-hoc
 *  • Adding tokens: always additive (next unused ID in range). Never reassign or
 *    delete an existing ID — it corrupts cross-customer model training data.
 */

export const INTENT_TAXONOMY = {
  // Navigation & Discovery
  101: 'HOMEPAGE_VIEW',
  102: 'PRICING_VIEW',
  103: 'DOCS_VIEW',
  104: 'BLOG_VIEW',
  105: 'FEATURE_PAGE_VIEW',
  106: 'ABOUT_VIEW',
  107: 'DEMO_PAGE_VIEW',
  108: 'SEARCH_INITIATED',
  109: 'SEARCH_NO_RESULTS',
  110: 'LOGIN_VIEW',
  111: 'SIGNUP_VIEW',
  112: 'PASSWORD_RESET_VIEW',
  113: 'CATEGORY_PAGE_VIEW',
  114: 'PRODUCT_COMPARISON_VIEW',
  115: 'ORDER_TRACKING_VIEW',
  116: 'LOYALTY_PAGE_VIEW',
  117: 'RETURNS_PAGE_VIEW',
  118: 'ORDER_HISTORY_VIEW',
  119: 'TERMS_POLICY_VIEW',
  201: 'PLAN_COMPARISON_VIEW',
  202: 'UPGRADE_CTA_CLICK',
  203: 'CHECKOUT_STARTED',
  204: 'CHECKOUT_STEP_BACK',
  205: 'PAYMENT_FORM_VIEW',
  206: 'PAYMENT_FORM_ERROR',
  207: 'PURCHASE_COMPLETED',
  208: 'TRIAL_STARTED',
  209: 'TRIAL_UPGRADE_PROMPT_VIEWED',
  210: 'ROI_CALCULATOR_USED',
  211: 'ADD_TO_CART',
  212: 'PRODUCT_DETAIL_VIEW',
  213: 'CART_VIEW',
  214: 'COUPON_APPLIED',
  215: 'WISHLIST_VIEW',
  216: 'WISHLIST_TO_CART',
  217: 'GUEST_CHECKOUT_STARTED',
  218: 'SHIPPING_CALCULATOR_USED',
  219: 'CART_ITEM_REMOVED',
  220: 'SIZE_GUIDE_VIEW',
  221: 'VARIANT_SELECTOR_USED',
  222: 'QUANTITY_ADJUSTED',
  223: 'DELIVERY_DATE_SELECTED',
  224: 'GIFT_OPTION_VIEW',
  225: 'PAYMENT_METHOD_SWITCHED',
  226: 'CONTENT_ASSET_DOWNLOADED',

  // Friction & Abandonment
  301: 'FORM_ABANDONMENT',
  302: 'ERROR_PAGE_VIEW',
  303: 'BACK_NAVIGATION',
  304: 'REPEAT_SAME_PAGE_VIEW',
  305: 'WORKFLOW_ABANDONED',
  306: 'MULTI_TAB_DETECTED',
  307: 'COPY_PASTE_IN_FORM',
  308: 'CHECKOUT_IDLE_60S',
  309: 'FORM_FIELD_CLEARED',
  310: 'FORM_SUBMIT_SUCCESS',
  311: 'FORM_SUBMIT_ERROR',

  // Churn Risk
  401: 'CANCELLATION_FLOW_VIEW',
  402: 'DATA_EXPORT_INITIATED',
  403: 'DOWNGRADE_VIEW',
  404: 'NPS_SURVEY_LOW',
  405: 'LOGIN_FREQUENCY_DROP',
  406: 'TEAM_ACTIVITY_DROP',
  407: 'FEATURE_USE_DROP',
  408: 'COMPETITOR_COMPARISON_VIEW',
  409: 'ACCOUNT_DELETION_VIEW',

  // Expansion & Upsell
  501: 'SEAT_CAPACITY_REACHED',
  502: 'SEAT_LIMIT_WARNING_VIEW',
  503: 'INVITE_BLOCKED_BY_PLAN',
  504: 'FEATURE_GATE_HIT',
  505: 'SSO_CONFIGURATION_VIEW',
  506: 'SOC2_DOCS_DOWNLOADED',
  507: 'PROCUREMENT_USER_ADDED',
  508: 'ENTERPRISE_FEATURE_PROBE',
  509: 'API_RATE_LIMIT_HIT',
  510: 'BILLING_HISTORY_VIEW',
  511: 'USAGE_DASHBOARD_VIEW',
  512: 'SUBSCRIPTION_RENEWED',
  513: 'ADD_ON_PAGE_VIEW',
  514: 'AUDIT_LOG_VIEW',
  515: 'DATA_RESIDENCY_VIEW',

  // Onboarding
  601: 'ONBOARDING_STARTED',
  602: 'ONBOARDING_STEP_FAIL',
  603: 'ONBOARDING_IDLE_120S',
  604: 'ONBOARDING_COMPLETED',
  605: 'FIRST_CORE_ACTION',
  606: 'INTEGRATION_SETUP_VIEW',
  607: 'INVITE_TEAM_VIEW',
  608: 'IMPORT_DATA_VIEW',
  609: 'SETUP_CHECKLIST_VIEW',
  610: 'ONBOARDING_HELP_TRIGGERED',
  611: 'INTEGRATION_CONNECTED',

  // Support & Help
  701: 'HELP_DOC_VIEW',
  702: 'SUPPORT_CHAT_OPENED',
  703: 'TICKET_SUBMITTED',
  704: 'STATUS_PAGE_VIEW',
  705: 'FAQ_VIEW',
  706: 'VIDEO_TUTORIAL_STARTED',
  707: 'COMMUNITY_FORUM_VIEW',
  708: 'SUPPORT_SEARCH_INITIATED',
  709: 'TICKET_RESOLVED',
  710: 'CHAT_RESOLVED',
  711: 'CSAT_SUBMITTED',
  712: 'WARRANTY_PAGE_VIEW',

  // Product Usage
  801: 'CORE_FEATURE_USED',
  802: 'ADVANCED_FEATURE_USED',
  803: 'EXPORT_INITIATED',
  804: 'REPORT_GENERATED',
  805: 'DASHBOARD_VIEW',
  806: 'SETTINGS_VIEW',
  807: 'ADMIN_PANEL_VIEW',
  808: 'API_KEY_GENERATED',
  809: 'WORKFLOW_COMPLETED',
  810: 'BULK_ACTION_USED',
  811: 'SHARE_INITIATED',
  812: 'REFERRAL_LINK_GENERATED',
  813: 'REVIEW_WRITE_INITIATED',
  814: 'AUTOMATION_CREATED',

  // Behavioral Signals (auto-detected, no URL mapping needed)
  901: 'RAGE_CLICK',        // 3+ clicks within 1s
  902: 'DEAD_CLICK',        // click with no DOM response
  903: 'IDLE_DRIFT_30S',
  904: 'IDLE_DRIFT_120S',
  905: 'SCROLL_DEPTH_25',
  906: 'SCROLL_DEPTH_75',
  907: 'SCROLL_RAGE',
  908: 'TAB_HIDDEN',
  909: 'TAB_RETURNED',
  910: 'SESSION_STARTED',
  911: 'SCROLL_DEPTH_50',
  912: 'SCROLL_DEPTH_100',

  // Security — Auth Events (1001–1099)
  // Fired by the app's auth layer, not URL patterns.
  1001: 'LOGIN_FAILED',             // authentication attempt rejected
  1002: 'LOGIN_SUCCESS_NEW_DEVICE', // successful login from a device not seen before
  1003: 'PASSWORD_RESET_INITIATED',
  1004: 'MFA_CHALLENGE_BYPASSED',   // MFA step skipped/missing when expected
  1005: 'ACCOUNT_LOCKED',           // too many failed attempts
  1006: 'LOGIN_SUCCESS',            // routine successful authentication (server-side)
  1007: 'SIGNUP_COMPLETED',         // account created (server-side auth hook)
  1008: 'LOGOUT',                   // session ended (server-side auth hook)

  // Security — Data Access (1101–1199)
  1101: 'BULK_RECORDS_ACCESSED',    // pagination through full dataset
  1102: 'EXPORT_ALL_INITIATED',     // full-scope data export (not single record)
  1103: 'SEARCH_ALL_RECORDS',       // wildcard / unfiltered search
  1104: 'SENSITIVE_FIELD_VIEWED',   // SSN, card, API secret revealed in UI

  // Security — Privileged Actions (1201–1299)
  1201: 'NEW_API_KEY_CREATED',      // distinct from 808 (API_KEY_GENERATED) — new key in fresh session
  1202: 'ADMIN_CONFIG_DELETED',     // irreversible config removal
  1203: 'PERMISSION_ELEVATED',      // own-role escalation attempt
  1204: 'TEAM_MEMBER_REMOVED',
  1205: 'WEBHOOK_DISABLED',

  // Security — Error / Probe Signals (1301–1399)
  1301: 'REPEATED_403_HIT',         // 3+ forbidden responses in one session
  1302: 'REPEATED_404_HIT',         // 5+ not-found responses — path enumeration
  1303: 'RATE_LIMITED_HIT',         // hit rate limiter (429)

  // Security — Account Modification (1401–1499)
  1401: 'EMAIL_CHANGED',
  1402: 'PAYMENT_METHOD_CHANGED',
  1403: 'BILLING_ADDRESS_CHANGED',
  1404: 'COUPON_APPLY_FAILED',      // invalid / already-used coupon attempt
  1405: 'REFUND_REQUESTED',
  1406: 'RETURN_INITIATED',
  1407: 'CONNECTED_APP_REVOKED',    // OAuth/integration disconnected

  // Security — Adversarial Agent Signals (1450–1469)
  // Fired server-side by the agent bridge when chat/navigation patterns are detected.
  // Never URL-mapped from the browser SDK. See docs/adversarial_intent_taxonomy_v1.json.
  1450: 'AGENT_CHAT_STARTED',           // agent opened without prior product browsing
  1451: 'AGENT_REFUSAL_RETRY',          // user message after agent policy refusal
  1452: 'AGENT_BOUNDARY_ESCALATION',    // progressive boundary-adjacent turns in chat
  1453: 'POLICY_PAGE_DEEP_READ',        // long dwell on policy/T&C/refund page
  1454: 'REFUND_POLICY_PAGE_VIEW',       // refund or cancellation policy page visited
  1455: 'PRIOR_REFUND_DENIED',          // cross-session prior refund denial (server flag)
  1456: 'AGENT_CAPABILITY_PROBE',       // systematic capability enumeration in chat
  1457: 'AGENT_GUARDRAIL_PROBE',        // rephrasing after refusal / guardrail mapping
  1458: 'AGENT_PROMPT_EXTRACTION',      // system-prompt or instruction surfacing attempt
  1459: 'AGENT_INJECTION_DETECTED',     // prompt injection pattern in chat input
  1460: 'AGENT_AUTHORITY_CLAIM',        // unverified executive/vendor/regulatory role claim
  1461: 'AGENT_THIRD_PARTY_TARGET',     // request targeting another user's account/data
  1462: 'AGENT_HARASSMENT_REQUEST',     // harassment/doxxing/stalking assistance request
  1463: 'AGENT_HIGH_COST_REQUEST',      // max-output/recursive/high-volume abuse request

  // Marketplace — Provider Lifecycle (1501–1529)
  // Fired server-side by the marketplace's provider-facing app or API.
  1501: 'PROVIDER_APPLICATION_STARTED',    // began provider onboarding/signup
  1502: 'PROVIDER_APPLICATION_ABANDONED',  // dropped off during application flow
  1503: 'PROVIDER_KYC_FRICTION',           // stuck or re-attempting identity verification
  1504: 'PROVIDER_APPLICATION_COMPLETED',  // finished all onboarding steps
  1505: 'PROVIDER_PROFILE_CREATED',        // published first public profile/listing
  1506: 'PROVIDER_FIRST_ACCEPTANCE',       // accepted first order, booking, or job
  1507: 'PROVIDER_FIRST_COMPLETION',       // completed first job/delivery — structural milestone
  1508: 'PROVIDER_FIRST_REVIEW_RECEIVED',  // received first customer review
  1509: 'PROVIDER_ONBOARDING_STALLED',     // idle 120s+ during provider onboarding
  1510: 'PROVIDER_AVAILABILITY_REMOVED',   // went offline or removed all availability slots
  1511: 'PROVIDER_PRICE_ADJUSTED',         // changed rates, surge opt-out, or pricing tier
  1512: 'PROVIDER_DISPUTE_SUBMITTED',      // raised a dispute or complaint
  1513: 'PROVIDER_PAYOUT_VIEW',            // viewed earnings/payout dashboard
  1514: 'PROVIDER_DEACTIVATION_FLOW_VIEW', // viewed account deactivation or leave page
  1515: 'PROVIDER_SUPPORT_ESCALATED',      // submitted a support ticket or escalation
  1516: 'PROVIDER_PREMIUM_TIER_VIEW',      // viewed pro/premium subscription page
  1517: 'PROVIDER_NEW_SERVICE_ADDED',      // expanded service or product catalogue
  1518: 'PROVIDER_NEW_AREA_EXPANDED',      // expanded service radius or delivery zone

  // Marketplace — Cross-side Signals (1530–1559)
  // Fired when platform-level supply/demand dynamics affect the user experience.
  1530: 'SUPPLY_SHORTAGE_SHOWN',       // demand user shown "no providers available"
  1531: 'SURGE_PRICE_SHOWN',           // demand user shown surge or peak pricing
  1532: 'SURGE_PRICE_ABANDONED',       // demand user saw surge price and left without booking
  1533: 'TRUST_REVIEW_DEEP_DIVE',      // first-time buyer read 5+ reviews before booking
  1534: 'REPEAT_PROVIDER_PROFILE_VIEW',// demand user viewed same provider profile 3+ times
  1535: 'PROVIDER_PROFILE_VIEW',       // demand user viewed a provider/listing profile
  1536: 'BOOKING_STARTED',             // demand user started a booking/reservation flow
  1537: 'BOOKING_CONFIRMED',           // booking confirmed (server-side marketplace hook)
  1538: 'BOOKING_CANCELLED',           // booking cancelled by demand user (server-side)
  1539: 'WAITLIST_JOINED',             // demand user joined waitlist after supply shortage
  1540: 'DEMAND_REVIEW_SUBMITTED',    // demand user submitted a review/rating for provider
  1541: 'REBOOK_SAME_PROVIDER',       // demand user re-booked same provider (repeat match signal)
  1542: 'BOOKING_FULFILLED',          // service completed or order delivered (server-side marketplace hook)

  // ─── Developer Intelligence — IDE Search Signals (1601–1619) ──────────────
  // Fired by the IDE extension (VS Code, JetBrains). No code content transmitted.
  1601: 'DEV_SEARCH_QUERY_SUBMITTED',     // any search query submitted in IDE
  1602: 'DEV_GREP_COMMAND_EXECUTED',      // grep/rg/ag ran in integrated terminal
  1603: 'DEV_FIND_IN_FILES_OPENED',       // IDE find-in-files panel opened
  1604: 'DEV_SYMBOL_LOOKUP_TRIGGERED',    // go-to-definition or symbol search
  1605: 'DEV_SEARCH_REFORMULATED',        // same-concept query resubmitted (fires per reformulation)
  1606: 'DEV_SEARCH_ZERO_RESULTS',        // search returned no results
  1607: 'DEV_SEARCH_ABANDONED',           // search panel closed with no result selected
  1608: 'DEV_SEMANTIC_SEARCH_QUERY',      // natural-language / AI-powered query submitted
  1609: 'DEV_REGEX_SEARCH_EXECUTED',      // regex pattern used in search
  1610: 'DEV_FIND_ALL_REFERENCES',        // "find all references" triggered on symbol
  1611: 'DEV_GLOBAL_RENAME_INITIATED',    // rename symbol across project initiated
  1612: 'DEV_AI_CODE_QUERY_SUBMITTED',    // Copilot / Cursor / Cody query submitted
  1613: 'DEV_AI_RESULT_ACCEPTED',         // AI suggestion accepted or applied
  1614: 'DEV_MULTI_FILE_RESULT_OPENED',   // ≥3 files opened from single search result set
  1615: 'DEV_CROSS_FILE_DEP_SEARCH',      // dependency/import chain searched across files

  // ─── Developer Intelligence — File & Code Navigation (1620–1649) ──────────
  // Fired by IDE extension. File paths hashed client-side — label only transmitted.
  1621: 'DEV_FILE_OPENED',               // any file opened in editor
  1622: 'DEV_MULTI_TAB_SWITCH',          // ≥4 tabs switched within 60s (exploration signal)
  1623: 'DEV_LONG_SESSION_NO_EDIT',       // session ≥600s with zero code edits (pure reading)
  1624: 'DEV_CURSOR_LINE_NAVIGATED',      // cursor jumped to specific line (not scrolled)
  1625: 'DEV_ARCHITECTURE_FILE_OPENED',   // README, CONTRIBUTING, proto, schema, migration file
  1626: 'DEV_LEGACY_FILE_OPENED',         // file last modified ≥2 years ago
  1627: 'DEV_DEPENDENCY_FILE_OPENED',     // package.json, requirements.txt, go.mod, Gemfile, etc.
  1628: 'DEV_TEST_FILE_OPENED',           // test/spec file opened
  1629: 'DEV_CONFIG_FILE_OPENED',         // .env, yaml config, Dockerfile, terraform file
  1630: 'DEV_FEATURE_FLAG_FILE_OPENED',   // feature flag definition file opened
  1631: 'DEV_GIT_BLAME_VIEWED',           // git blame annotation activated
  1632: 'DEV_DIFF_VIEW_OPENED',           // diff/compare view opened
  1633: 'DEV_FIRST_CLONE_DETECTED',       // first git clone in this developer's history for repo
  1634: 'DEV_README_FIRST_SESSION',       // README opened and is first file opened in session
  1635: 'DEV_MULTI_SERVICE_REPOS_OPEN',   // ≥3 different service repositories open simultaneously
  1636: 'DEV_API_CONTRACT_WITH_CONSUMER', // OpenAPI/proto spec and consumer code open together
  1637: 'DEV_TODO_HIGH_DENSITY_FILE',     // file with ≥10 TODO/FIXME comments opened
  1638: 'DEV_SINGLE_AUTHOR_BLAME',        // git blame shows ≥80% single author in open file

  // ─── Developer Intelligence — SRE & Incident (1650–1699) ─────────────────
  // Fired by CLI wrapper (command type only, no content) and observability webhooks.
  1651: 'DEV_PAGERDUTY_ALERT_ACKED',      // PagerDuty alert acknowledged
  1652: 'DEV_INCIDENT_CHANNEL_OPENED',    // incident Slack/Teams channel opened
  1653: 'DEV_RUNBOOK_PAGE_OPENED',        // runbook page or doc opened
  1654: 'DEV_MULTI_DASHBOARD_OPEN',       // ≥3 observability dashboard tabs open simultaneously
  1655: 'DEV_TERMINAL_RAPID_COMMANDS',    // ≥5 commands executed within 60s
  1656: 'DEV_LOG_SEARCH_INITIATED',       // log search or filter initiated (Datadog/Grafana/Loki)
  1657: 'DEV_ALERT_FIRING_DETECTED',      // active alert firing signal received from obs platform
  1658: 'DEV_KUBECTL_REPEATED',           // kubectl describe/logs on same pod ≥3 times
  1659: 'DEV_LOG_QUERY_REFORMULATED',     // log query reformulated ≥3 times same concept
  1660: 'DEV_INCIDENT_SEVERITY_UPGRADED', // incident severity level increased (e.g. P2 → P1)
  1661: 'DEV_WAR_ROOM_CREATED',           // war room / bridge channel created
  1662: 'DEV_INCIDENT_RESOLVED',          // incident marked resolved in obs platform
  1663: 'DEV_POSTMORTEM_OPENED',          // postmortem template or doc opened
  1664: 'DEV_PRODUCTION_DEPLOY_INITIATED',// production deployment pipeline triggered
  1665: 'DEV_HELM_UPGRADE_EXECUTED',      // helm upgrade command executed
  1666: 'DEV_FEATURE_FLAG_ENABLED_PROD',  // feature flag enabled in production environment
  1667: 'DEV_ROLLBACK_INITIATED',         // rollback command executed or rollback flow opened
  1668: 'DEV_ALERT_SILENCED_IMMEDIATELY', // alert silenced within <10s of acknowledgment
  1669: 'DEV_ONCALL_HANDOFF_REQUESTED',   // on-call handoff or early relief requested
  1670: 'DEV_SLO_BREACH_CONFIRMED',       // SLO error budget breach confirmed by obs platform
  1671: 'DEV_SERVICE_DEPMAP_OPENED',      // service dependency / topology map opened
  1672: 'DEV_SECONDARY_ONCALL_CONTACTED', // secondary on-call engineer messaged or paged
  1673: 'DEV_TRACE_SEARCH_REPEATED',      // same distributed trace span searched ≥3 times

  // ─── Developer Intelligence — GitHub Issue Triage (1700–1749) ────────────
  // Fired by GitHub App. Issue/PR content never transmitted — only behavioral metadata.
  1701: 'DEV_ISSUE_QUICK_READ',           // issue opened and closed/dismissed in <30s
  1702: 'DEV_ISSUE_LABEL_APPLIED',        // label applied to issue
  1703: 'DEV_ISSUE_ASSIGNED',             // issue assigned to a developer
  1704: 'DEV_ISSUE_CLOSED_WONT_FIX',      // issue closed as won't fix without investigation
  1705: 'DEV_BATCH_TRIAGE_SESSION',       // ≥5 issues processed in single session (bulk mode)
  1706: 'DEV_ISSUE_DEEP_READ',            // issue open for ≥180s (active investigation)
  1707: 'DEV_LINKED_PR_SEARCHED',         // PR or commit searched from within an issue
  1708: 'DEV_CODE_REF_OPENED_FROM_ISSUE', // code reference in issue body opened in IDE
  1709: 'DEV_RELATED_ISSUES_SEARCHED',    // related / similar issues searched from current issue
  1710: 'DEV_ISSUE_PRIORITY_ESCALATED',   // issue label changed to P0/P1/critical
  1711: 'DEV_ISSUE_MILESTONE_SPRINT_SET', // issue milestone set to current sprint
  1712: 'DEV_CUSTOMER_REFERENCED_ISSUE',  // multiple customer references detected in issue comments
  1713: 'DEV_ISSUE_DUPLICATE_SEARCH',     // ≥2 searches within issue to find duplicates
  1714: 'DEV_ISSUE_CLOSED_DUPLICATE',     // issue closed as duplicate
  1715: 'DEV_REGRESSION_KEYWORD',         // "regression" / "worked before" keyword detected in issue
  1716: 'DEV_GIT_BISECT_RUN',             // git bisect command executed
  1717: 'DEV_CROSS_REPO_ISSUE_SEARCH',    // issue search spanning ≥3 repositories
  1718: 'DEV_CHANGELOG_WITH_ISSUE',       // changelog/CHANGELOG file opened alongside an issue
  1719: 'DEV_COMMIT_REFERENCED_ISSUE',    // specific commit hash referenced in issue
  1720: 'DEV_ISSUE_TIMELINE_SCROLLED',    // issue timeline scrolled multiple times (≥3)
  1721: 'DEV_RELEASE_TAG_REFERENCED',     // release/version tag referenced in issue context

  // ─── Developer Intelligence — Codebase Exploration & Performance (1750–1799)
  // Mix of IDE extension and CLI wrapper signals.
  1751: 'DEV_PROFILER_OUTPUT_OPENED',     // profiler output file opened in IDE
  1752: 'DEV_QUERY_EXEC_PLAN_VIEWED',     // database query execution plan viewed
  1753: 'DEV_N_PLUS_ONE_DETECTED',        // N+1 query pattern detected in open file (static analysis)
  1754: 'DEV_BENCHMARK_FILE_OPENED',      // benchmark test file opened
  1755: 'DEV_FLAMEGRAPH_OPENED',          // flamegraph or trace visualization opened
  1756: 'DEV_SLOW_QUERY_LOG_REFERENCED',  // slow query log file or view referenced
  1757: 'DEV_NPM_AUDIT_RUN',              // npm audit / pip-audit / cargo audit executed
  1758: 'DEV_DEPENDENCY_DIFF_VIEWED',     // dependency version diff viewed across branches
  1759: 'DEV_CVE_DATABASE_SEARCHED',      // CVE / security advisory database accessed from session
  1760: 'DEV_LOCKFILE_CONFLICT',          // lockfile merge conflict detected (package-lock, poetry.lock)
  1761: 'DEV_SECURITY_ADVISORY_OPENED',   // GitHub / npm / PyPI security advisory page opened
  1762: 'DEV_TOP_LEVEL_DIRS_BROWSED',     // ≥3 top-level project directories opened sequentially
  1763: 'DEV_SERVICE_DEP_FILES_OPENED',   // ≥3 service dependency files opened (docker-compose, k8s yaml)
  1764: 'DEV_API_SCHEMA_OPENED',          // OpenAPI spec, proto file, or GraphQL schema opened
  1765: 'DEV_DB_MIGRATIONS_BROWSED',      // database migration files browsed sequentially
  1766: 'DEV_GIT_LOG_FEATURE_FILTERED',   // git log filtered by feature name or keyword
  1767: 'DEV_PR_SEARCH_FEATURE_KEYWORD',  // PR search filtered by feature-specific keyword
  1768: 'DEV_FEATURE_BRANCH_CHECKOUT',    // feature branch checked out
  1769: 'DEV_CONTRIBUTING_MD_OPENED',     // CONTRIBUTING.md or equivalent file opened
  1770: 'DEV_SETUP_SCRIPT_RUN',           // initial dev environment setup script executed
  1771: 'DEV_TRACE_ID_MULTI_LOG_SEARCH',  // same trace ID searched across multiple log sources
  1772: 'DEV_PERF_DB_INDEX_OPENED',       // database index definition file opened (perf context)
  1773: 'DEV_CACHING_LAYER_OPENED',       // caching layer code (Redis/Memcached client) opened

  // ─── Developer Intelligence — Behavioral Signals (1900–1999) ─────────────
  // Auto-detected by IDE extension / CLI wrapper. No explicit URL/event mapping.
  1901: 'DEV_IDE_IDLE_AFTER_SEARCH',      // ≥30s idle immediately after a search — frustration signal
  1902: 'DEV_SWITCHED_TO_BROWSER',        // external browser opened after failed IDE search
  1903: 'DEV_MULTI_TOOL_SESSION',         // IDE + terminal + GitHub active simultaneously
  1904: 'DEV_HIGH_KEYSTROKE_VELOCITY',    // sustained high KPM — actively writing code
  1905: 'DEV_LOW_KEYSTROKE_VELOCITY',     // sustained low KPM while file open — reading/blocked
  1906: 'DEV_SLACK_OPENED_AFTER_SEARCH',  // Slack opened immediately after a failed search
  1907: 'DEV_EXTERNAL_DOCS_OPENED',       // external documentation site opened from IDE context
  1908: 'DEV_SESSION_STARTED',            // developer tool session initiated

  // ─── Industry Vertical tokens: 2000–9999 RESERVED ─────────────────────────
  // Do not assign tokens in 2000–9999 without a formal namespace proposal.
  // Reserved blocks (planned, not yet active):
  //   2000–2999  Finance & Fintech
  //   3000–3999  Healthcare & Life Sciences
  //   4000–4999  Legal & Compliance
  //   5000–5999  Education & EdTech
  //   6000–6999  Real Estate & PropTech
  //   7000–7999  Manufacturing & Supply Chain
  //   8000–8999  Government & Public Sector
  //   9000–9999  Reserved for future verticals
} as const;

export type TokenId = keyof typeof INTENT_TAXONOMY;
export type IntentLabel = (typeof INTENT_TAXONOMY)[TokenId];

/** Reverse map: label → token ID */
export const TOKEN_BY_LABEL: Record<IntentLabel, TokenId> = Object.fromEntries(
  (Object.entries(INTENT_TAXONOMY) as [string, IntentLabel][]).map(
    ([id, label]) => [label, parseInt(id) as TokenId]
  )
) as Record<IntentLabel, TokenId>;

/** Returns true if `n` is a valid global token ID */
export function isValidTokenId(n: number): n is TokenId {
  return n in INTENT_TAXONOMY;
}

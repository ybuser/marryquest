# Netlify credit controls

Last verified against the official Netlify documentation: 2026-07-19.

## Scope

This runbook controls deploy and runtime credit usage for the MarryQuest staging site. It does not change the Netlify plan, purchase credits, enable auto recharge, or modify Dashboard settings. Before using the numbers below, confirm the team's actual plan under **Usage & billing > Plan details**: accounts created before September 4, 2025 can still be on a legacy plan whose meters differ.

The operator reported that the team's credits were exhausted at the start of Recovery-03C. After PR #32 was pushed, GitHub reported its Netlify Deploy Preview, Header rules, and Redirect rules checks as successful. Record that Preview as restored service, not as proof of the current Dashboard balance or approval for a stable deploy. The raw Netlify build log was not inspected, so its individual secret-scan, OpenNext-packaging, and rate-rule post-processing lines remain separate evidence gates. If a future Preview cannot start while the Dashboard still reports no available balance, record it as `BLOCKED_BY_NETLIFY_CREDITS`; never substitute a local build for an actual platform result.

## Credit-based Free limits and meters

For a credit-based Free team:

- The monthly allowance is 300 credits with a hard limit.
- A successful production deploy costs 15 credits. A failed deploy and a rollback to an earlier production deploy do not consume the production-deploy meter.
- Deploy Preview and branch deploy creation use zero deploy credits, but they are not cost-free environments: their traffic contributes to web requests, bandwidth, and any Function or Preview-server compute they use.
- Compute costs 10 credits per GB-hour and includes Functions, Preview servers, Agent Runners, and Netlify Database compute.
- Bandwidth costs 20 credits per GB.
- Web requests cost 2 credits per 10,000 requests and include production, active branch/Preview URLs, Functions, redirects, assets, and Edge Functions.
- When the team balance is exhausted, all projects owned by that team are paused. Web traffic, form submissions, production deploys, Deploy Previews, and branch deploys stop until the next billing cycle or an approved plan change restores service.
- Free has no credit-pack or auto-recharge option. Personal and Pro offer paid credits; Personal includes 1,000 monthly credits and Pro starts at 3,000. Auto recharge is off by default and must remain off unless a Team Owner explicitly approves a billing change.

Official references:

- [How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)
- [Credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Configure credit auto recharge](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/configure-auto-recharge/)
- [Buy credit packs](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/buy-credit-packs/)
- [Resume paused projects](https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/)

## MarryQuest deploy budget

The internal budget is intentionally lower than Netlify's theoretical maximum:

- Use Deploy Preview for reviewed PRs, while remembering that Preview traffic and compute are still metered.
- Limit successful stable `Production`-context deploys to eight per billing cycle and no more than one routine release milestone per week. Eight deploys consume 120 credits before runtime usage.
- Reserve the remaining allowance for Functions, bandwidth, web requests, emergency fixes, and the next controlled release.
- Do not use repeated manual production deploys as a debugging loop. Reproduce locally and in Preview first.
- Batch a reviewed code merge, required environment-variable corrections, and a prepared smoke checklist into one stable deploy whenever possible. Dashboard environment changes that require a redeploy should be grouped rather than applied one at a time.
- A rollback is preferred over rebuilding an unchanged earlier release; Netlify documents production rollback as not consuming production-deploy credits.

This budget is an operating policy, not a Netlify-enforced cap. A future `build-ignore`, release branch, or changed continuous-deployment policy requires separate approval and is not added by Recovery-03C.

## Usage review and alerts

Before approving a stable deploy, check:

1. **Usage & billing > Credit balance** for remaining credits and the billing-cycle reset date.
2. **Usage & billing > Credit usage breakdown** for the meter causing the spend.
3. **Usage & billing > Account usage insights** for the daily AI inference, bandwidth, compute, production deploy, and web-request trend.
4. The month's successful stable deploy count against the eight-deploy internal budget.

Netlify's current monitoring page documents notifications at 50%, 75%, and 100%; its billing FAQ also mentions a 90% notification. Do not depend on a guaranteed 90% automatic alert. Use these internal gates:

- 50%: identify the dominant meter and confirm the planned release budget.
- 75%: freeze non-critical stable deploys and review the Dashboard daily.
- 90%: operator-enforced emergency-only mode, even if no automatic notification arrives.
- 100%: follow the paused-project recovery procedure below.

See [Monitor usage for Credit-based plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/monitor-usage-for-credit-based-plans/) and the [billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/).

## Agent Runner policy

MarryQuest does not require Netlify Agent Runners. Keep Netlify AI features disabled when they are not deliberately in use, or set the member Agent Runner limit to zero. An Agent Runner can consume both compute and AI inference credits; AI inference is currently converted at 180 credits per USD of provider usage. Disabling an unused runner prevents it from competing with deploy and runtime capacity.

See [Manage AI features](https://docs.netlify.com/build/build-with-ai/manage-ai-for-your-team/manage-ai-features/) and [Pricing for AI features](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/pricing-for-ai-features/).

## Paused-project recovery

When credits are exhausted:

1. Confirm the actual plan, exhausted meter, remaining balance, and next reset date in **Usage & billing**.
2. Stop non-essential Preview traffic, manual deploy attempts, and any Agent Runner work.
3. On Free, either wait for the next billing-cycle reset or obtain explicit approval to move to Personal/Pro. Free cannot buy a pack or enable auto recharge.
4. If a paid plan is approved, keep auto recharge off by default. A Team Owner must separately approve any pack purchase or recharge policy.
5. After Netlify reports the projects resumed, perform one controlled deploy only if code or configuration actually changed.
6. Verify `/api/health`, protected `/api/ready`, owner login, Timeline upload/render, and the two existing rate-limit rules. Record the credit balance after the smoke.

Do not attempt to solve a paused account by weakening secret scanning, exposing Preview secrets, running database migrations during build, or repeatedly triggering production deploys.

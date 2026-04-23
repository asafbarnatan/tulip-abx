# LinkedIn Campaign Creation Runbook

**Goal:** Create one real Sponsored Content campaign on LinkedIn, anchored in the agent-drafted copy, running against a live audience, with $50 budget. Fulfills Nathan's Integration requirement.

**Time required:** 45 minutes total (5 for Page setup, 25 for campaign, 15 buffer for LinkedIn UI friction)

**Cost:** $50, reimbursable per Nathan's email.

---

## Before you start

Open these three things in separate browser tabs:
1. **Mission Control:** `http://localhost:3000/mission-control`
2. **LinkedIn Page setup:** `https://www.linkedin.com/company/setup/new/`
3. **LinkedIn Campaign Manager:** `https://www.linkedin.com/campaignmanager/`

You'll bounce between them.

---

## Part 1 — Create your Company Page (5 minutes)

LinkedIn requires Sponsored Content to be posted BY a Company Page. You don't have admin on Tulip's Page, so create your own.

### Steps

1. Go to tab 2 (`linkedin.com/company/setup/new/`)
2. Select **Company** (not Showcase)
3. Fill in:
   - **Page name:** `ABX Demo Lab` *(or any name tied to your consulting brand)*
   - **LinkedIn public URL:** `abx-demo-lab` *(LinkedIn will tell you if it's taken; add a digit if so)*
   - **Website:** leave blank OR use `https://tulip.co` OR your personal site
   - **Industry:** `Management Consulting` *(or `Software Development`)*
   - **Company size:** `1` employee
   - **Company type:** `Self-employed` or `Sole proprietorship`
   - **Logo:** upload any clean square image (solid-color tile is fine for now)
   - **Tagline:** `Agentic marketing operating systems for enterprise GTM teams` *(or skip)*
4. Check the verification box
5. Click **Create page**

You'll land on the new Page. You're now the Super Admin.

### If LinkedIn flags the Page for review

Sometimes LinkedIn puts a brand-new single-person Page into review status. If that happens:
- You'll see a yellow banner saying "Page under review"
- **Your Page can still run ads during review** — the restriction is usually about follow-growth features, not ads
- Proceed to Part 2; if Campaign Manager blocks you later, fall back to **Text Ads** (Part 5)

---

## Part 2 — Grab the agent-drafted copy (1 minute)

1. Go to tab 1 (Mission Control)
2. Find the **LinkedIn Campaigns** panel on the right
3. Expand the **Bayer AG** campaign card *(recommendation: Bayer is the sharpest story for the demo — €200M modernization, Wuppertal beachhead, EMA inspection pressure)*
4. Copy the **headline** (italic, max 150 chars)
5. Copy the **ad copy** (below the headline, max 600 chars)

**Keep these open or paste them into a scratch doc — you'll need them in Part 3.**

If Bayer's copy doesn't inspire you, check the Thermo Fisher or RTX cards — those have sharp openers too. Pick whichever you can stand behind on stage.

---

## Part 3 — Create the campaign in Campaign Manager (25 minutes)

### 3a. Set up the Ad Account

1. Go to tab 3 (`linkedin.com/campaignmanager`)
2. If this is your first time, LinkedIn will walk you through creating an ad account:
   - **Ad account name:** `TulipABX Demo`
   - **Currency:** `USD`
   - **Page:** select the **ABX Demo Lab** Page you created in Part 1 *(it should appear in the dropdown)*
   - Click Create
3. You may be asked to add a payment method. Use your credit card. Tulip reimburses per Nathan's email — save the receipt.

### 3b. Create the Campaign Group

1. In your new ad account, click **Create** (top right) → **Campaign group**
2. **Name:** `TulipABX Demo — April 2026`
3. **Status:** Active
4. Click **Next**

### 3c. Create the Campaign

You're now creating a campaign inside the group.

1. **Objective:** Click **Website visits** (under "Consideration")
2. Click **Next**

### 3d. Audience targeting

This section has many options — here's what to select for a Bayer-aligned audience:

1. **Locations:**
   - Include: `Germany`, `Europe`
   - *Optional:* narrow to `Leverkusen, Germany` if you want to tightly target Bayer's HQ
2. **Audience attributes:** Click **Narrow audience further**
   - **Job functions:** select `Quality Assurance`, `Operations`, `Engineering`, `Information Technology`
   - **Job titles:** *(optional, but recommended)* type and select: `VP of Manufacturing`, `Head of Quality`, `Plant Manager`, `Director of Operations`
   - **Industries:** `Pharmaceuticals`, `Biotechnology Research`, `Medical Equipment Manufacturing`
   - **Company size:** `10,001+ employees`
3. **Member languages:** English, German
4. **Audience expansion:** Uncheck (keep targeting tight for a $50 budget)
5. Check the estimated audience size — LinkedIn will show you something like "Estimated audience size: 250,000 — 500,000". For $50 over 4 days, you'll get roughly 5,000-15,000 impressions.
6. Click **Next**

### 3e. Ad format and placement

1. **Ad format:** select **Single image ad** *(the most visual format — looks best in demo)*
2. **LinkedIn Audience Network:** UNCHECK *(keep impressions on LinkedIn only for cleaner metrics)*
3. Click **Next**

### 3f. Budget and schedule

1. **Budget type:** `Lifetime budget`
2. **Lifetime budget:** `$50`
3. **Start date:** today
4. **End date:** April 26, 2026 *(3 days before demo, giving the campaign enough runtime to accumulate real data)*
5. **Bid strategy:** `Maximum delivery (automated)`
6. Click **Next**

### 3g. Create the actual Ad

Now you're setting up the ad creative.

1. Click **Create new ad**
2. **Ad name:** `TulipABX — Bayer AG — May 2026`
3. **Introductory text (headline area):** paste the **headline** you copied from Mission Control in Part 2
4. **Destination URL:** `https://tulip.co/industries/pharmaceuticals/` *(or any relevant Tulip page)*
5. **Upload image:** upload a single image, 1200x627 pixels recommended
   - No image on hand? Use [unsplash.com](https://unsplash.com) → search `pharmaceutical manufacturing` → download any clean image
   - Or use a plain colored square with Tulip-ish navy/teal coloring
   - LinkedIn will show you the preview — make sure the composition looks decent
6. **Ad description:** paste the **ad copy** you copied from Mission Control in Part 2
7. **Call to action button:** select `Learn more`
8. On the right you'll see a live preview of how your ad will appear in the LinkedIn feed — verify it looks right
9. Click **Next**

### 3h. Review and launch

1. Review the summary page — double-check budget ($50), dates, targeting, ad preview
2. Click **Launch campaign**
3. LinkedIn will confirm the campaign is live — usually within a few minutes of clicking Launch it starts serving impressions

### 3i. Copy the campaign URL

After launch, you'll land on the campaign detail page. The URL in your browser address bar looks like:

```
https://www.linkedin.com/campaignmanager/accounts/123456789/campaigns/987654321
```

**Copy this entire URL.** You'll paste it into Mission Control next.

---

## Part 4 — Link the campaign in Mission Control (1 minute)

1. Go back to tab 1 (Mission Control)
2. Expand the **Bayer AG** campaign card
3. Click **▶ Publish to LinkedIn**
4. Paste the URL from Part 3i into the `linkedin_campaign_id` field *(the extractor will auto-grab the numeric ID — you can paste the full URL or just the numeric ID, either works)*
5. Budget: `50`
6. Click **✓ Mark as Published**

The card flips to **LIVE ON LINKEDIN** (green border + glow). You're done with the build.

---

## Part 5 — Fallback if Sponsored Content is blocked

If Part 3 fails because your Page is under review or LinkedIn refuses to serve Sponsored Content for some reason:

1. Go back to Campaign Manager → **Create** → **Campaign group** → new campaign
2. **Objective:** Website visits (same as before)
3. **Ad format:** select **Text ad** (not Single image ad)
4. Text ads don't need a Page association — they run from your personal ad account
5. Fill in: Headline (short version, 25 chars), Description (75 chars), Destination URL, upload a small 100x100 icon
6. Same audience + budget + schedule
7. Launch

Text ads look less impressive visually (they appear in the LinkedIn sidebar, not the feed) but they fulfill the "real campaign" requirement and produce real metrics.

---

## Part 6 — Daily metric refresh (2 minutes/day until April 27)

Three options, pick whichever is easiest for you:

### Option 1 — Paste CSV (fastest, shipped last night)

1. In Campaign Manager → **Analytics** tab → **Export** (top right) → **Performance CSV**
2. Download the file, open it
3. Select all content, copy
4. In Mission Control → LinkedIn Campaigns panel → click **📊 Import CSV** (top right of panel)
5. Paste → click **Import metrics**
6. Modal shows `✓ 1 campaign updated` with impressions/clicks/cost

### Option 2 — Per-campaign form

1. Campaign Manager → note impressions / clicks / cost / leads
2. Mission Control → expand the Bayer card → click **Update metrics**
3. Update the 4 fields → Save

### Option 3 — Nothing

The campaign runs regardless. If you skip metric refreshes, by April 27 the Mission Control will show $0 / 0 imp (because nothing was entered). You'd then do a single CSV import the morning of the demo.

---

## Troubleshooting

### "LinkedIn says my Page is too new to advertise"

- Wait 24 hours and retry, OR
- Switch to **Text Ads** (Part 5) which don't require Page history, OR
- Use an existing LinkedIn Page you have admin on (personal consulting brand, side project, etc.)

### "I don't want to show my real credit card on a demo screen"

- Hide it in Campaign Manager settings → Billing → the card number is never shown on the Analytics screens you'll demo
- You can also remove the card after the $50 budget is spent

### "The ad isn't getting impressions"

- Check LinkedIn Campaign Manager → Campaign status should be **Active** (not Pending / Paused / In review)
- Brand-new Pages sometimes have a 1-24 hour ad review period before impressions start
- Broaden the audience targeting (job functions too narrow can starve the campaign)
- Confirm bid is Maximum delivery (not a manual low CPC bid)

### "LinkedIn is asking me to verify my identity"

- Normal for new ad accounts. Upload the requested ID.
- This is separate from Company Page verification (which you don't need for ads).

### "The audience size is too small"

- Under 5,000 people in targeting → LinkedIn won't serve the campaign
- Broaden: remove a location restriction, add more job functions, raise company size threshold

---

## Demo-day screenshot checklist

Before April 27, capture screenshots of these views as fallbacks in case live screens fail:

- [ ] LinkedIn Campaign Manager → Campaigns list showing the active campaign with impressions and clicks
- [ ] LinkedIn Campaign Manager → Analytics tab showing the full performance chart
- [ ] Mission Control → LinkedIn Campaigns panel with the **LIVE ON LINKEDIN** Bayer card
- [ ] Mission Control → expanded Bayer card showing agent-drafted copy + real metrics side by side
- [ ] Mobile view of the ad on your phone (LinkedIn mobile feed) — powerful "this is really running" proof

---

## Post-launch, before demo day

Each evening:
1. Export CSV from Campaign Manager
2. Paste into Mission Control via 📊 Import CSV button
3. Verify the card shows updated numbers

By April 27 morning, you'll have 4-5 days of compounding impression data to show Nathan.

---

## The 30-second demo moment (from DEMO_SCRIPT.md beat 4)

When you hit the LinkedIn integration beat, say something like:

> *"You told me to integrate with a real LinkedIn campaign. I did. This is live on LinkedIn right now — [N] impressions, [N] clicks, $[N] spent — targeting manufacturing VPs in Europe using the agent-drafted headline and ad copy you saw generated. The agent drafted the copy. I reviewed it. I published to Campaign Manager. No agent auto-publishes paid media — that's the governance surface enterprise marketing actually needs."*

That's the payoff.

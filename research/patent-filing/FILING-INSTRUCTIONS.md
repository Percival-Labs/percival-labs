# Provisional Patent Filing Instructions

## Filing Method: USPTO Patent Center (Electronic)

**URL:** https://patentcenter.uspto.gov
**Filing type:** Provisional Application under 35 U.S.C. § 111(b)
**Fee:** $320 (micro entity)

---

## Pre-Filing Checklist

- [ ] **Verify micro entity eligibility** (see certification below)
- [ ] **Create USPTO.gov account** if you don't have one (https://account.uspto.gov)
- [ ] **Confirm LLC formation** — Percival Labs LLC must be active before filing as assignee
- [ ] **Review provisional-patent-application.md** one final time
- [ ] **Convert specification to PDF** — Patent Center accepts PDF uploads
- [ ] **Have credit/debit card ready** for $320 filing fee

---

## Step-by-Step Filing Process

### 1. Log in to Patent Center
- Go to https://patentcenter.uspto.gov
- Sign in with your USPTO.gov account (create one if needed — free)

### 2. Start New Submission
- Click "New submission" → "Provisional application"
- Select "Micro entity" for fee reduction

### 3. Upload Documents
Upload these files (all as PDF):

| Document | File | Required? |
|----------|------|-----------|
| Specification | `provisional-patent-application.pdf` | YES |
| Cover Sheet | `cover-sheet-sb16.pdf` | YES |
| Micro Entity Certification | `micro-entity-certification.pdf` | YES |
| Inventor Declaration | Not required for provisional | NO (optional) |

**To convert .md to PDF:**
```bash
# Option 1: Use a Markdown-to-PDF tool
npx md-to-pdf provisional-patent-application.md

# Option 2: Open in browser and Print to PDF
# Open the .md in VS Code, use Markdown Preview, Print to PDF

# Option 3: Use pandoc
pandoc provisional-patent-application.md -o provisional-patent-application.pdf
```

### 4. Fill in Application Data
- **Title:** TRUST-STAKED ECONOMIC ACCOUNTABILITY SYSTEM FOR AUTONOMOUS AI AGENTS WITH PRIVACY-PRESERVING TRUST ATTESTATION AND PER-AGENT INFERENCE GOVERNANCE
- **Inventor:** Alan Carroll, Bellingham, WA, US
- **Applicant/Assignee:** Percival Labs LLC, Bellingham, WA, US
- **Correspondence address:** Your mailing address (or registered agent)

### 5. Pay Filing Fee
- $320 for micro entity provisional application
- Credit/debit card accepted

### 6. Receive Confirmation
- USPTO issues a filing receipt with:
  - **Application number** (important — save this)
  - **Filing date** (this is your priority date)
  - **Confirmation number**
- Save the receipt PDF immediately

---

## After Filing

### Immediate (same day)
- [ ] Save filing receipt PDF to this directory
- [ ] Record application number in project docs
- [ ] Note the **12-month deadline** for non-provisional filing

### Within 30 days
- [ ] Consider patent counsel review for non-provisional strategy
- [ ] Evaluate international filing needs (PCT application)

### Within 12 months (CRITICAL DEADLINE)
- [ ] File non-provisional application (claims examined) OR
- [ ] Let provisional expire (prior art still established via defensive disclosures)
- [ ] If filing non-provisional: budget $10,000-15,000 for attorney + fees

---

## Important Notes

1. **A provisional patent is NOT examined.** It only establishes a priority date. You must file a non-provisional within 12 months to get an actual patent.

2. **The provisional MUST contain adequate disclosure** of everything you want to claim in the non-provisional. Our 44-claim specification with detailed descriptions satisfies this.

3. **You CAN say "patent pending"** after filing. This applies to the specific inventions described in the application.

4. **Keep the specification confidential** until filing. After filing, you can discuss freely — the priority date is locked.

5. **Claims 16-22 (ZK trust proofs) are not yet publicly disclosed.** File BEFORE discussing these publicly. The defensive disclosures (DD-001 through DD-004) cover other claim groups.

---

## Cost Summary

| Item | Cost | When |
|------|------|------|
| Provisional filing (micro entity) | $320 | Now |
| Non-provisional filing (micro entity) | $800 | Within 12 months (if pursuing) |
| Patent attorney (optional) | $2,000-5,000 | Before non-provisional |
| Non-provisional prosecution | $10,000-15,000 | 12-36 months |
| **Minimum to establish priority date** | **$320** | **Now** |

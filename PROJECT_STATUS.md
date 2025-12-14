# Media Machine - Project Status & Comprehensive Roadmap

**Last Updated:** December 14, 2024

## Current State: LIVE (MVP)

- **Production URL:** https://media-machine.vercel.app
- **Custom Domain:** mediamachine.app (DNS pending)
- **GitHub:** https://github.com/therealdansickles/media-machine

---

## Completed

### Infrastructure
- [x] GitHub repo with auto-deploy to Vercel
- [x] Supabase connection working (env vars with `.trim()` fix)
- [x] Next.js 16.0.10 (security patched)
- [x] Vercel Analytics integrated

### Backend (n8n + Supabase)
- [x] Spider Agent workflow scraping entertainment news
- [x] Articles stored with entity extraction via Claude
- [x] Analyst summaries generated per article
- [x] link_status filtering ('active' articles only)

### Frontend Components Built
- [x] `PrestigeFeed` - Main feed with hero section
- [x] `ArticleCard` - Cards with entity tags, sentiment badges
- [x] `Header` - Logo + theme toggle
- [x] `SidebarStack` - Container for widgets
- [x] `SocialPulse` - Tabbed social trends (hardcoded data)
- [x] `TrendingCreators` - Creator rankings (hardcoded data)
- [x] `ShowtimesWidget` - Films iframe + TV schedule API
- [x] `TickerInterrupter` - Box office marquee (hardcoded)
- [x] `DataCardTooltip` - Entity/sentiment tooltip (hardcoded)
- [x] `SubmissionBox` - Tip submission form (not wired up)
- [x] `ThemeToggle` - Dark/light mode switching

---

## In Progress

### DNS Configuration
Update in Squarespace:
- **A Record:** `@` → `216.150.1.1`
- **CNAME:** `www` → `2f11f35aae5695bb.vercel-dns-016.com`

---

## Roadmap - Full Task List

### Phase 1: Data Pipeline Completion

#### 1.1 Image Generation (Priority: HIGH)
- [ ] OpenAI org is verified - enable DALL-E in n8n workflow
- [ ] Generate images based on article headlines/summaries
- [ ] Store URLs in `image_url` field (frontend already uses it)
- [ ] Add fallback logic for failed generations

#### 1.2 Entity System Overhaul (Priority: HIGH)
- [ ] Create `entities` table in Supabase:
  ```sql
  CREATE TABLE entities (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT, -- 'person', 'company', 'property', 'deal'
    context TEXT,
    article_id UUID REFERENCES articles(id),
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Update n8n workflow to insert entities as separate records
- [ ] Create indexes for fast entity lookups
- [ ] Update frontend to fetch entities via join or separate query

#### 1.3 Fix DataCardTooltip
- [ ] Pass real entity data from article to tooltip (currently hardcoded)
- [ ] Display actual sentiment score from database
- [ ] Show real topic tags

---

### Phase 2: Core Pages & Navigation

#### 2.1 Individual Article Pages (Priority: HIGH)
- [ ] Create `/article/[id]/page.tsx` route
- [ ] Full article view with:
  - Hero image (full width)
  - Headline, analyst summary
  - Entity tags as clickable filters
  - Source attribution with link to original
  - Related articles section
  - Share buttons (Twitter, LinkedIn, Copy link)

#### 2.2 Pagination (Priority: HIGH)
- [ ] Implement "Load More Stories" functionality
- [ ] Use Supabase `.range()` for offset pagination
- [ ] OR implement cursor-based pagination for performance
- [ ] Add loading state while fetching

#### 2.3 Header Navigation (Priority: MEDIUM)
- [ ] Add navigation links:
  - Categories (Film, TV, Streaming, Business)
  - Search icon → search modal
  - About link
- [ ] Mobile hamburger menu
- [ ] Sticky behavior on scroll

#### 2.4 Footer (Priority: MEDIUM)
- [ ] Create footer component with:
  - About Media Machine
  - Newsletter signup
  - Social links
  - Legal (Privacy, Terms)
  - Copyright

#### 2.5 About Page (Priority: LOW)
- [ ] Create `/about/page.tsx`
- [ ] Mission statement, team info
- [ ] Contact information

---

### Phase 3: Search & Filtering

#### 3.1 Search Functionality (Priority: HIGH)
- [ ] Full-text search on headlines + summaries
- [ ] Search modal or dedicated search page
- [ ] Debounced input with instant results
- [ ] Highlight matches in results

#### 3.2 Category Filtering (Priority: MEDIUM)
- [ ] Filter by category: breaking, analysis, news
- [ ] URL-based filters (`/?category=breaking`)
- [ ] Category pages (`/category/[slug]`)

#### 3.3 Source Filtering (Priority: MEDIUM)
- [ ] Filter by source (Variety, Deadline, THR, etc.)
- [ ] Source pages (`/source/[name]`)

#### 3.4 Entity-Based Filtering (Priority: MEDIUM)
- [ ] Click entity tag → filter all articles mentioning that entity
- [ ] Entity pages (`/entity/[name]`)
- [ ] Show entity profile (all mentions, sentiment over time)

---

### Phase 4: UI/UX Polish

#### 4.1 Light Mode Fixes (Priority: HIGH)
- [ ] Fix contrast issues - text too light on light backgrounds
- [ ] Audit all components for proper light/dark variants
- [ ] Test with accessibility tools (contrast ratios)

#### 4.2 Typography - Fraunces Font (Priority: HIGH)
- [ ] Fix font not loading - currently falls back to Georgia
- [ ] Ensure `--font-fraunces` CSS variable is applied correctly
- [ ] Check font weights (400, 700, 900) are loaded

#### 4.3 Favicon & Icons (Priority: MEDIUM)
- [ ] Create/verify these files exist in `/public`:
  - `icon-light-32x32.png`
  - `icon-dark-32x32.png`
  - `icon.svg`
  - `apple-icon.png`
- [ ] Add OG image for social sharing

#### 4.4 Loading States (Priority: MEDIUM)
- [ ] Skeleton loaders for article cards
- [ ] Skeleton for hero section
- [ ] Smooth transitions between states

#### 4.5 Mobile Polish (Priority: MEDIUM)
- [ ] Review all breakpoints
- [ ] Touch-friendly tap targets
- [ ] Swipe gestures for navigation

---

### Phase 5: Live Data for Widgets

#### 5.1 Social Pulse - Real Data (Priority: MEDIUM)
- [ ] Integrate TikTok/Instagram/YouTube APIs OR
- [ ] Scrape trending entertainment content
- [ ] Store in Supabase, update periodically via n8n

#### 5.2 Trending Creators - Real Data (Priority: LOW)
- [ ] Pull from social APIs or curate manually
- [ ] Link to creator profiles

#### 5.3 Box Office Ticker - Real Data (Priority: MEDIUM)
- [ ] Integrate Box Office Mojo API or scrape data
- [ ] Update ticker with real weekend numbers
- [ ] Add weekly comparisons

---

### Phase 6: Engagement Features

#### 6.1 Submission Box - Wire Up (Priority: LOW)
- [ ] Create Supabase `submissions` table
- [ ] API route to handle form submission
- [ ] Email notification for new tips
- [ ] Spam protection (rate limiting, captcha)

#### 6.2 Newsletter Signup (Priority: MEDIUM)
- [ ] Email capture form
- [ ] Integrate with email service (Resend, Mailchimp)
- [ ] Welcome email flow

#### 6.3 Share Functionality (Priority: MEDIUM)
- [ ] Share buttons on articles
- [ ] Copy link with toast notification
- [ ] Native share on mobile

---

### Phase 7: Performance & SEO

#### 7.1 Image Optimization (Priority: HIGH)
- [ ] Replace `<div style={{backgroundImage}}>` with `<Image>` component
- [ ] Use Next.js image optimization
- [ ] Add blur placeholders
- [ ] Lazy loading for below-fold images

#### 7.2 SEO (Priority: HIGH)
- [ ] Dynamic meta tags per article page
- [ ] Open Graph tags for social sharing
- [ ] Twitter card meta tags
- [ ] Structured data (JSON-LD) for articles

#### 7.3 Sitemap & RSS (Priority: MEDIUM)
- [ ] Generate sitemap.xml automatically
- [ ] RSS feed for articles (`/feed.xml`)

#### 7.4 Error Handling (Priority: MEDIUM)
- [ ] Error boundary components
- [ ] Custom 404 page
- [ ] Custom 500 page
- [ ] Graceful degradation when Supabase is down

---

### Phase 8: Future Features (Post-Launch)

#### 8.1 Real-Time Updates
- [ ] Supabase Realtime subscriptions
- [ ] New article toast notifications
- [ ] Live updating without refresh

#### 8.2 User Accounts
- [ ] Supabase Auth integration
- [ ] User profiles
- [ ] Saved/bookmarked articles
- [ ] Reading history

#### 8.3 Personalization
- [ ] Follow entities/topics
- [ ] Personalized feed algorithm
- [ ] Email digest preferences

#### 8.4 Analytics Dashboard
- [ ] Track popular articles
- [ ] Entity mention trends
- [ ] Sentiment analysis over time

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Supabase client init |
| `components/prestige-feed.tsx` | Main feed, data fetching |
| `components/article-card.tsx` | Article card display |
| `components/header.tsx` | Site header |
| `components/sidebar-stack.tsx` | Sidebar container |
| `components/social-pulse.tsx` | Social trends widget |
| `components/trending-creators.tsx` | Creator rankings |
| `components/showtimes-widget.tsx` | Films/TV schedule |
| `components/ticker-interrupter.tsx` | Box office marquee |
| `components/data-card-tooltip.tsx` | Entity tooltip |
| `app/globals.css` | Theme variables, animations |
| `types/article.ts` | TypeScript interfaces |

---

## Environment Variables

Required in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=https://mrmoxwfjgcaimbqrqqoz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

**Important:** No trailing whitespace in env var values.

---

## Resume Checklist

When resuming development:
1. `cd ~/media-machine`
2. `npm run dev`
3. Check DNS status for mediamachine.app
4. Pick a task from Phase 1-4 based on priority

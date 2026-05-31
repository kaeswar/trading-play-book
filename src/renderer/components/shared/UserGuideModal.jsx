import React, { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';

// ── Helper components (language-agnostic) ────────────────────────────────────
function GuideBlock({ title, children }) {
  return (
    <div className="p-3 rounded-lg bg-surface-700/40 border border-surface-600/40 space-y-1">
      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">{title}</p>
      <div className="text-sm text-gray-400 leading-relaxed space-y-1">{children}</div>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="flex gap-2 p-3 rounded-lg bg-primary-500/5 border border-primary-500/20">
      <svg className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs text-primary-300 leading-relaxed">{children}</p>
    </div>
  );
}

// ── Section content builders ──────────────────────────────────────────────────
function getSections(t, language) {
  const isTa = language === 'ta';

  return [
    {
      id: 'overview',
      label: t('guideOverview'),
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      content: isTa ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-300 leading-relaxed">
            Trading Play Book என்பது ஒழுக்கம் கடைபிடிக்கும் வர்த்தக நாட்குறிப்பு. ஒவ்வொரு வர்த்தக நாளையும் மூன்று கட்டங்களாக பிரிக்கிறது:
          </p>
          <div className="space-y-2">
            {[
              { label: 'முன்சந்தை திட்டம்', desc: 'சந்தை திறப்பதற்கு முன் உங்கள் எதிர்பார்ப்புகளையும் வர்த்தக திட்டங்களையும் பதிவு செய்யுங்கள்.' },
              { label: 'சந்தைக்கு பிறகு', desc: 'சந்தை முடிந்த பிறகு உண்மையில் என்ன நடந்தது என்று பதிவு செய்யுங்கள் — திட்டத்தின் முடிவை புதுப்பிக்கவும்.' },
              { label: 'தொகுப்பு & பகுப்பாய்வு', desc: 'கடந்த நாட்களை ஆய்வு செய்யுங்கள், சார்பு/முடிவு வாரியாக வடிகட்டுங்கள், மற்றும் முறைகளை கண்டறியுங்கள்.' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex gap-3 p-3 rounded-lg bg-surface-700/40 border border-surface-600/40">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-300 leading-relaxed">
            Trading Play Book is a discipline-first trading journal. It splits each trading day into three phases:
          </p>
          <div className="space-y-2">
            {[
              { label: 'Pre-Market Plan', desc: 'Document your expectations and trade plans before the market opens.' },
              { label: 'Post-Market (Edit Plan)', desc: 'Record what actually happened — update plan results after market close.' },
              { label: 'Gallery & Analysis', desc: 'Review past days, filter by bias/outcome, and spot patterns.' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex gap-3 p-3 rounded-lg bg-surface-700/40 border border-surface-600/40">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    {
      id: 'premarket',
      label: t('guidePreMarket'),
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      content: isTa ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">சந்தை திறப்பதற்கு முன் உங்கள் வர்த்தகத்தை திட்டமிடுங்கள். இரண்டு வகையான திட்டங்கள் கிடைக்கின்றன.</p>
          <GuideBlock title="இயல்புநிலை திட்டங்கள் (6 காட்சிகள்)">
            <p>சந்தை அமைப்பை அடிப்படையாக கொண்ட ஆறு தொடக்க காட்சிகள் — 3 ஏற்றம் (A1, A2, A3) மற்றும் 3 இறக்கம் (B1, B2, B3). ஒவ்வொரு காட்சிக்கும் நீங்கள் அமைக்கலாம்:</p>
            <ul className="mt-2 space-y-1">
              <li>இலக்கு விலை மற்றும் நிறுத்து நஷ்ட நிலை</li>
              <li>வர்த்தக யோசனையின் விளக்கம்</li>
              <li>உங்கள் சார்ட் பகுப்பாய்வின் திரைப்படங்கள்</li>
              <li>நிகழ்நேர செயல்படுத்தலை கண்காணிக்க இன்ட்ராடே குறிப்புகள்</li>
            </ul>
          </GuideBlock>
          <GuideBlock title="தனிப்பட்ட திட்டங்கள்">
            <p>6 காட்சிகளுக்கு அப்பால் உங்கள் சொந்த வர்த்தக திட்டங்களை உருவாக்கவும். ஒவ்வொரு தனிப்பட்ட திட்டத்திலும்:</p>
            <ul className="mt-2 space-y-1">
              <li>தலைப்பு மற்றும் விரிவான வர்த்தக திட்ட குறிப்புகள்</li>
              <li>சார்பு குறியீடு: மிகவும் ஏற்றம் / ஏற்றம் / நடுநிலை / இறக்கம் / மிகவும் இறக்கம்</li>
              <li>இலக்கு மற்றும் நிறுத்து நஷ்ட நிலைகள்</li>
              <li>திரைப்படங்கள் மற்றும் இன்ட்ராடே குறிப்புகள்</li>
            </ul>
          </GuideBlock>
          <Tip>திட்டங்களை உருவாக்குவதற்கு முன் மேலே குறியீடு மற்றும் தேதியை தேர்ந்தெடுக்கவும். பயன்பாடு தானாகவே புதிய வர்த்தக நாளை உருவாக்கும்.</Tip>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">Plan your trade before the market opens. Two types of plans are available.</p>
          <GuideBlock title="Default Plans (6 Scenarios)">
            <p>Six opening scenarios based on market structure — 3 Bullish (A1, A2, A3) and 3 Bearish (B1, B2, B3). For each scenario you can set:</p>
            <ul className="mt-2 space-y-1">
              <li>Target price and Stop Out level</li>
              <li>Description of the trade idea</li>
              <li>Screenshots of your chart analysis</li>
              <li>Intraday notes to track execution in real time</li>
            </ul>
          </GuideBlock>
          <GuideBlock title="Custom Plans">
            <p>Create your own trade plans beyond the 6 scenarios. Each custom plan has:</p>
            <ul className="mt-2 space-y-1">
              <li>Title and detailed trade plan notes</li>
              <li>Bias tag: Super Bullish / Bullish / Range Bound / Bearish / Super Bearish</li>
              <li>Target and Stop Out levels</li>
              <li>Screenshots and intraday notes</li>
            </ul>
          </GuideBlock>
          <Tip>Select the symbol and date at the top before creating plans. The app creates a new trading day automatically.</Tip>
        </div>
      ),
    },

    {
      id: 'postmarket',
      label: t('guidePostMarket'),
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      content: isTa ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">சந்தை முடிந்த பிறகு, ஒவ்வொரு திட்டத்தையும் உண்மையில் என்ன நடந்தது என்று புதுப்பிக்கவும்.</p>
          <GuideBlock title="இயல்புநிலை திட்ட தீர்ப்பு">
            <p>6 காட்சிகளில் எது நடந்தது என்று தேர்ந்தெடுத்து முடிவை (ஏற்றுக்கொள்ளப்பட்டது / நிராகரிக்கப்பட்டது) பதிவு செய்யுங்கள். இது தொகுப்பில் உங்கள் பகுப்பாய்வு புள்ளிவிவரங்களை புதுப்பிக்கும்.</p>
          </GuideBlock>
          <GuideBlock title="தனிப்பட்ட திட்ட தீர்ப்பு">
            <p>ஒவ்வொரு தனிப்பட்ட திட்டத்திற்கும் முடிவை குறிக்கவும்:</p>
            <ul className="mt-2 space-y-1">
              <li><span className="text-emerald-400 font-medium">வெற்றி</span> — திட்டம் எதிர்பார்த்தபடி செயல்பட்டது</li>
              <li><span className="text-red-400 font-medium">தோல்வி</span> — திட்டம் வேலை செய்யவில்லை</li>
              <li><span className="text-amber-400 font-medium">பகுதி</span> — ஓரளவு வெற்றி</li>
              <li><span className="text-gray-400 font-medium">ரத்தானது</span> — வர்த்தகம் எடுக்கப்படவில்லை</li>
            </ul>
            <p className="mt-2">ஒவ்வொரு தனிப்பட்ட திட்டத்திற்கும் தீர்ப்பு குறிப்புகளையும் சேர்க்கலாம்.</p>
          </GuideBlock>
          <Tip>இரண்டு பகுதிகளும் தெளிவாக பிரிக்கப்பட்டுள்ளன — இயல்புநிலை திட்ட தீர்ப்பு மேலே, தனிப்பட்ட திட்ட தீர்ப்பு கீழே. ஒவ்வொன்றையும் தனியாக புதுப்பிக்கவும்.</Tip>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">After market close, update each plan with what actually happened.</p>
          <GuideBlock title="Default Plan Verdict">
            <p>Select which of the 6 scenarios played out and record the outcome (Accepted / Rejected). This updates your analysis statistics in the Gallery.</p>
          </GuideBlock>
          <GuideBlock title="Custom Plan Verdict">
            <p>For each custom plan, mark the result:</p>
            <ul className="mt-2 space-y-1">
              <li><span className="text-emerald-400 font-medium">Pass</span> — plan executed as expected</li>
              <li><span className="text-red-400 font-medium">Fail</span> — plan did not work out</li>
              <li><span className="text-amber-400 font-medium">Partial</span> — partially successful</li>
              <li><span className="text-gray-400 font-medium">Cancelled</span> — trade was not taken</li>
            </ul>
            <p className="mt-2">You can also add verdict notes for each custom plan.</p>
          </GuideBlock>
          <Tip>The two sections are clearly separated — Default Plan Verdict on top, Custom Plan Verdict below. Update each independently.</Tip>
        </div>
      ),
    },

    {
      id: 'gallery',
      label: t('guideGallery'),
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      content: isTa ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">உங்கள் கடந்த அனைத்து வர்த்தக நாட்களையும் ஒரே இடத்தில் ஆய்வு செய்யுங்கள்.</p>
          <GuideBlock title="நாள் அட்டைகள்">
            <p>ஒவ்வொரு அட்டையும் தேதி, குறியீடு மற்றும் தீர்ப்பு நிலையை ஒரு பார்வையில் காட்டுகிறது:</p>
            <ul className="mt-2 space-y-1">
              <li>இயல்புநிலை திட்ட நாட்களுக்கு தீர்ப்பு முடிவு குறியீடு (ஏற்றுக்கொள்ளப்பட்டது / நிராகரிக்கப்பட்டது)</li>
              <li>தனிப்பட்ட திட்டங்களுக்கு வெற்றி / தோல்வி / பகுதி / ரத்தானது குறியீடுகள்</li>
              <li><span className="text-amber-400">தீர்ப்பு நிலுவையில்</span> — இன்னும் தீர்ப்பு பதிவு இல்லை</li>
            </ul>
          </GuideBlock>
          <GuideBlock title="வடிகட்டிகள்">
            <ul className="space-y-1">
              <li><span className="text-gray-200 font-medium">தேதி வரம்பு</span> — தொடக்க / இறுதி தேதி வாரியாக வடிகட்டவும்</li>
              <li><span className="text-gray-200 font-medium">இயல்புநிலை திட்டம்</span> — எந்த காட்சி (A1–B3) வாரியாக வடிகட்டவும்</li>
              <li><span className="text-gray-200 font-medium">சார்பு</span> — மிகவும் ஏற்றம், ஏற்றம், நடுநிலை, இறக்கம், மிகவும் இறக்கம்</li>
              <li><span className="text-gray-200 font-medium">முடிவு / தீர்ப்பு</span> — இயல்புநிலை திட்டத்திற்கு ஏற்றுக்கொள்ளப்பட்டது/நிராகரிக்கப்பட்டது; தனிப்பட்ட திட்டத்திற்கு வெற்றி/தோல்வி/பகுதி/ரத்தானது</li>
              <li><span className="text-gray-200 font-medium">தயாரிப்பு</span> — திட்டம் இருந்த நாட்கள் மற்றும் இல்லாத நாட்களை வடிகட்டவும்</li>
            </ul>
          </GuideBlock>
          <GuideBlock title="பார்க்க & நீக்க">
            <p>ஒவ்வொரு அட்டையின் கீழே இரண்டு செயல் பொத்தான்கள் உள்ளன — <span className="text-primary-400">பார்</span> என்பது நாள் விவரங்களை திறக்கும், <span className="text-red-400">நீக்கு</span> என்பது உறுதிப்படுத்தலுடன் நாளை நீக்கும்.</p>
          </GuideBlock>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">Review all your past trading days in one place.</p>
          <GuideBlock title="Day Cards">
            <p>Each card shows the date, symbol, and verdict status at a glance:</p>
            <ul className="mt-2 space-y-1">
              <li>Verdict outcome badge (Accepted / Rejected) for default plan days</li>
              <li>Custom plan verdict badges (Pass / Fail / Partial / Cancelled)</li>
              <li><span className="text-amber-400">Verdict Pending</span> — no verdict recorded yet</li>
            </ul>
          </GuideBlock>
          <GuideBlock title="Filters">
            <ul className="space-y-1">
              <li><span className="text-gray-200 font-medium">Date Range</span> — filter by From / To date</li>
              <li><span className="text-gray-200 font-medium">Default Plan</span> — filter by which scenario (A1–B3)</li>
              <li><span className="text-gray-200 font-medium">Bias</span> — Super Bullish, Bullish, Range Bound, Bearish, Super Bearish</li>
              <li><span className="text-gray-200 font-medium">Outcome / Verdict</span> — Accepted/Rejected for default plans; Pass/Fail/Partial/Cancelled for custom plans</li>
              <li><span className="text-gray-200 font-medium">Preparation</span> — filter days where you had a plan vs did not</li>
            </ul>
          </GuideBlock>
          <GuideBlock title="View & Remove">
            <p>Each card has two action buttons at the bottom — <span className="text-primary-400">View</span> to open the day detail, and <span className="text-red-400">Remove</span> to delete the day with confirmation.</p>
          </GuideBlock>
        </div>
      ),
    },

    {
      id: 'swing',
      label: t('guideSwing'),
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      content: isTa ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">இன்ட்ராடே திட்டங்களிலிருந்து தனியாக பல நாட்கள் ஸ்விங் வர்த்தக அமைப்புகளை கண்காணிக்கவும்.</p>
          <GuideBlock title="திட்டம் உருவாக்குதல்">
            <p>ஒரே படிவத்தில் அனைத்து விவரங்களையும் நிரப்பவும்:</p>
            <ul className="mt-2 space-y-1">
              <li>பங்கு பெயர் மற்றும் இணைக்கப்பட்ட குறியீடு (விருப்பம்)</li>
              <li>கால அளவு: மாதாந்திர / வாராந்திர / தினசரி / 4மணி / 1மணி</li>
              <li>நிறத்துடன் சார்பு குறியீடு</li>
              <li>நுழைவு, இலக்கு மற்றும் நிறுத்து நஷ்ட விலைகள்</li>
              <li>திட்ட தேதி மற்றும் செயல்படுத்தல் நிலை (காத்திருக்கிறது)</li>
              <li>சார்ட் படம் (Ctrl+V ஒட்டவும் அல்லது பதிவேற்றவும்)</li>
            </ul>
          </GuideBlock>
          <GuideBlock title="செயல்படுத்தல் நிலை">
            <ul className="space-y-1">
              <li><span className="text-gray-400 font-medium">காத்திருக்கிறது</span> — அமைப்பு தயார், இன்னும் தொடங்கவில்லை</li>
              <li><span className="text-emerald-400 font-medium">வெற்றி</span> — வர்த்தகம் வெற்றிகரமாக முடிந்தது</li>
              <li><span className="text-red-400 font-medium">தோல்வி</span> — வர்த்தகம் வேலை செய்யவில்லை</li>
              <li><span className="text-amber-400 font-medium">பகுதி</span> — ஓரளவு வெற்றி</li>
              <li><span className="text-gray-500 font-medium">ரத்தானது</span> — அமைப்பு செல்லாததாகியது</li>
            </ul>
          </GuideBlock>
          <Tip>பங்கு பெயர், கால அளவு, சார்பு அல்லது நிலை வாரியாக அனைத்து ஸ்விங் அமைப்புகளையும் தேட மற்றும் வடிகட்ட ஸ்விங் தொகுப்பை பயன்படுத்துங்கள்.</Tip>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">Track multi-day swing trade setups independently of your intraday plans.</p>
          <GuideBlock title="Creating a Plan">
            <p>Fill in all details in one step — no second screen:</p>
            <ul className="mt-2 space-y-1">
              <li>Stock name and linked symbol (optional)</li>
              <li>Timeframe: Monthly / Weekly / Daily / 4Hrs / 1Hrs</li>
              <li>Bias tag with colour coding</li>
              <li>Entry, Target, and Stop Loss prices</li>
              <li>Plan Date and Execution Status (defaults to Waiting)</li>
              <li>Chart image (paste from clipboard with Ctrl+V or upload)</li>
            </ul>
          </GuideBlock>
          <GuideBlock title="Execution Status">
            <ul className="space-y-1">
              <li><span className="text-gray-400 font-medium">Waiting</span> — setup is ready, not yet triggered</li>
              <li><span className="text-emerald-400 font-medium">Pass</span> — trade worked out</li>
              <li><span className="text-red-400 font-medium">Fail</span> — trade did not work</li>
              <li><span className="text-amber-400 font-medium">Partial</span> — partial success</li>
              <li><span className="text-gray-500 font-medium">Cancelled</span> — setup invalidated</li>
            </ul>
          </GuideBlock>
          <Tip>Use the Swing Gallery to search and filter all your swing setups by stock name, timeframe, bias, or status.</Tip>
        </div>
      ),
    },

    {
      id: 'backup',
      label: t('guideBackup'),
      icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
      content: isTa ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">உள்ளமைவு காப்புப்பிரதி அமைப்பைப் பயன்படுத்தி உங்கள் தரவை பாதுகாத்து, கணினிகளுக்கு இடையே மாற்றவும்.</p>
          <GuideBlock title="காப்புப்பிரதி உருவாக்கு">
            <p><span className="text-gray-200">அமைப்புகள் → காப்புப்பிரதி / மீட்டமை</span> க்கு செல்லவும் மற்றும் <span className="text-primary-400">காப்புப்பிரதி உருவாக்கு (.tpbj)</span> என்பதை கிளிக் செய்யவும். இது அனைத்தையும் ஏற்றுமதி செய்கிறது — வர்த்தக நாட்கள், திட்டங்கள், தீர்ப்புகள், குறிப்புகள், ஸ்விங் திட்டங்கள் மற்றும் அனைத்து படங்களையும் ஒரு <code className="text-xs bg-surface-700 px-1 py-0.5 rounded">.tpbj</code> கோப்பாக.</p>
          </GuideBlock>
          <GuideBlock title="காப்புப்பிரதியிலிருந்து மீட்டமை">
            <p><span className="text-amber-400">காப்புப்பிரதியை தேர்ந்தெடு & மீட்டமை</span> என்பதை கிளிக் செய்து உங்கள் <code className="text-xs bg-surface-700 px-1 py-0.5 rounded">.tpbj</code> கோப்பை தேர்ந்தெடுக்கவும். புதிய பதிவுகள் தற்போதுள்ள தரவுடன் இணைக்கப்படும் — ஏற்கனவே உள்ள உள்ளீடுகள் மேி எழுதப்படாது மற்றும் எதுவும் நீக்கப்படாது. வெற்றிகரமான மீட்டமைவிற்கு பிறகு பயன்பாடு தானாக மீண்டும் ஏற்றும்.</p>
          </GuideBlock>
          <Tip>உங்கள் தரவுத்தளம் <code className="text-xs bg-surface-700 px-1 py-0.5 rounded">AppData\Roaming\Trading Play Book\trading-journal.db</code> என்ற இடத்தில் உள்ளூரில் சேமிக்கப்படுகிறது — கூடுதல் காப்புப்பிரதியாக இந்த கோப்பை நேரடியாக நகலெடுக்கலாம்.</Tip>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">Keep your data safe and transfer it between machines using the built-in backup system.</p>
          <GuideBlock title="Create Backup">
            <p>Go to <span className="text-gray-200">Settings → Backup / Restore</span> and click <span className="text-primary-400">Create Backup (.tpbj)</span>. This exports everything — trading days, plans, verdicts, notes, swing plans, and all images — into a single <code className="text-xs bg-surface-700 px-1 py-0.5 rounded">.tpbj</code> file.</p>
          </GuideBlock>
          <GuideBlock title="Restore from Backup">
            <p>Click <span className="text-amber-400">Select &amp; Restore Backup</span> and pick your <code className="text-xs bg-surface-700 px-1 py-0.5 rounded">.tpbj</code> file. New records are merged into your current data — existing entries are not overwritten and nothing is deleted. The app reloads automatically after a successful restore.</p>
          </GuideBlock>
          <Tip>Your database is also stored locally at <code className="text-xs bg-surface-700 px-1 py-0.5 rounded">AppData\Roaming\Trading Play Book\trading-journal.db</code> — you can copy this file directly as an additional backup.</Tip>
        </div>
      ),
    },
  ];
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function UserGuideModal({ onClose }) {
  const { t, language } = useLanguage();
  const [activeSection, setActiveSection] = useState('overview');

  const sections = getSections(t, language);
  const current = sections.find(s => s.id === activeSection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-3xl mx-4 overflow-hidden flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-base font-bold text-white">{t('userGuide')}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-44 flex-shrink-0 border-r border-surface-600/50 p-2 space-y-0.5 overflow-y-auto bg-surface-800/50">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                  activeSection === s.id
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-5 overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-100 mb-4">{current.label}</h3>
            {current.content}
          </div>
        </div>
      </div>
    </div>
  );
}

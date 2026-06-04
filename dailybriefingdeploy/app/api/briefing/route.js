import { NextResponse } from 'next/server';

const STORE_KEY = 'briefing_current';

async function getStore() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv');
    return {
      get: async (key) => kv.get(key),
      set: async (key, val) => kv.set(key, val),
    };
  }
  return null;
}

export async function GET() {
  try {
    const store = await getStore();
    if (store) {
      const data = await store.get(STORE_KEY);
      if (data) return NextResponse.json(data);
    }

    return NextResponse.json(getSampleBriefing());
  } catch (e) {
    return NextResponse.json(getSampleBriefing());
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.BRIEFING_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await getStore();
    if (store) {
      await store.set(STORE_KEY, body);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'No storage configured' }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function getSampleBriefing() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hour = now.getHours();
  const type = hour < 11 ? 'morning' : hour < 15 ? 'midday' : 'afternoon';

  return {
    date: dateStr,
    briefingType: type,
    alerts: [
      { title: 'Foodbuy Red Alert — 6/3/2026', description: 'Total Nutrition Inc. expands recall of TNVitamins Moringa Capsules — possible Salmonella. Likely supplements, not food service — verify.' },
      { title: 'Foodbuy Red Alert — 6/2/2026 (still open)', description: 'Champion Foods recalls Motor City Pizza Co. 5 Cheese Bread — potential Salmonella. Check if carried at any MIT location.' },
    ],
    items: [
      { id: '1', type: 'action', priority: 'urgent', priorityLabel: 'URGENT', description: 'Reply to Karen Vaillancourt (TriMark) — held orders #100224543 & #100224542 ready for delivery', sender: 'Karen.Vaillancourt@trimarkusa.com', age: '5h ago', note: 'needs your cell # for driver', completed: false },
      { id: '2', type: 'action', priority: 'urgent', priorityLabel: 'URGENT', description: 'Myles Crowley (MIT) — June catering invoices 26769 & 26770 missing details, needs resend', sender: 'mcrowley@mit.edu', age: '5h ago', note: 'Eric sent originals, Myles can\'t read them', completed: false },
      { id: '3', type: 'action', priority: 'today', priorityLabel: 'TODAY', description: 'Melyssa Centeno — Summer 2026 cost center is live, review employee transfers', sender: 'Melyssa.Centeno@cafebonappetit.com', age: 'just now', note: 'also flagged MyStaff import issue', completed: false },
      { id: '4', type: 'action', priority: 'today', priorityLabel: 'TODAY', description: 'Amy Sherburne (TriMark) — Gatehouse quote, asking Alfonso for needs list', sender: 'Amy.Sherburne@trimarkusa.com', age: '3h ago', note: 'you\'re CC\'d, Alfonso is lead', completed: false },
      { id: '5', type: 'action', priority: 'urgent', priorityLabel: 'URGENT', description: 'Get added to Supply America accounts — residential & retail', sender: null, age: null, note: 'fall saved carts will be lost — contact Jiamei', completed: false },
      { id: '6', type: 'action', priority: 'week', priorityLabel: 'THIS WEEK', description: 'Get added to ODP office supply account #90643565', sender: null, age: null, note: 'contact Jiamei Jiang', completed: false },
      { id: '7', type: 'action', priority: 'week', priorityLabel: 'DUE 6/7', description: 'Pepsi machine replacement — assigned to you from house meeting', sender: 'Eric.Macharia@cafebonappetit.com', age: 'yesterday', note: null, completed: false },
      { id: '10', type: 'fyi', priority: 'fyi', priorityLabel: 'FYI', description: 'Heather Ryall — Vassar St lane closure, Eversource work, detours in effect', sender: 'hryall@mit.edu', age: '3h ago', completed: false },
      { id: '11', type: 'fyi', priority: 'fyi', priorityLabel: 'CONFIRMED', description: 'Boston Food Safety — ServSafe order #BFS-1171 confirmed, online course ready', sender: 'learn@bostonfoodsafety.com', age: '5h ago', completed: false },
      { id: '12', type: 'fyi', priority: 'fyi', priorityLabel: 'FYI', description: 'Ahmed Mueed shared FY26 Purchase Planner - June P9 for editing', sender: 'MITChefs group', age: 'yesterday', completed: false },
      { id: '13', type: 'fyi', priority: 'fyi', priorityLabel: 'APPROVED', description: 'Vacation approved — Alfonso OK\'d both you and Eric. Eric gone 7/31–8/17.', sender: null, age: 'yesterday', completed: false },
    ],
    calendar: [
      { time: '11:00 AM', title: 'Onboarding Document Review', location: 'Teams · with Eric Macharia', highlight: false },
      { time: '11:45 AM – 1:30 PM', title: 'Gabriela FOH Manager Interview', location: 'Teams · Eric, Alfonso, Pina, Melyssa + candidate', highlight: false },
      { time: '5:00 – 7:00 PM', title: 'Jim\'s Retirement Party', location: 'Redbones, 55 Chester St, Somerville', highlight: true },
    ],
    prepNotes: 'Tomorrow: Mandatory Menu Review (in-person, 2 PM) — review Pedro\'s June 8-12 menu changes. Good time to raise the two-veggie-sides standard. Also: Meeting on the Books with Alfonso and MIT contacts at 11 AM.',
    tomorrowPreview: 'Thursday: Retail Manager Meeting (9 AM, Stata Center) — breakfast options, cash handling, audit. Senior Management Meeting (10 AM). Fall 2026 Planning (1-3 PM).',
  };
}

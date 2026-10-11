/**
 * Deterministic synthetic company dataset. These are invented records shaped like SaaSquatch
 * scrape output; they are not real companies and contain no personal contact data.
 */

export interface SeedCompany {
  sourceRecordId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  employeeCount: number | null;
  estimatedRevenue: number | null;
  revenueSource: string | null;
  attributes: { linkedinUrl: string | null; description: string; foundedYear: number | null };
}

export const SEED_SOURCE = 'synthetic_demo_seed';
const COUNT = 150;

// mulberry32: tiny seeded PRNG so every run produces the same dataset.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INDUSTRIES = [
  'Software',
  'IT Services',
  'Healthcare Services',
  'Manufacturing',
  'Construction',
  'Logistics',
  'Retail',
  'Financial Services',
  'Marketing Agency',
  'Accounting',
  'HVAC Services',
  'Education',
];

const LOCATIONS: { country: string; weight: number; places: [string, string | null][] }[] = [
  {
    country: 'United States',
    weight: 60,
    places: [
      ['Austin', 'TX'],
      ['Denver', 'CO'],
      ['Columbus', 'OH'],
      ['Glendale', 'CA'],
      ['Raleigh', 'NC'],
      ['Tampa', 'FL'],
      ['Minneapolis', 'MN'],
      ['Phoenix', 'AZ'],
    ],
  },
  {
    country: 'Canada',
    weight: 12,
    places: [
      ['Toronto', 'ON'],
      ['Calgary', 'AB'],
      ['Vancouver', 'BC'],
    ],
  },
  {
    country: 'United Kingdom',
    weight: 10,
    places: [
      ['Manchester', null],
      ['Leeds', null],
    ],
  },
  { country: 'Germany', weight: 6, places: [['Munich', null]] },
  { country: 'Australia', weight: 6, places: [['Brisbane', 'QLD']] },
  { country: 'India', weight: 6, places: [['Pune', 'MH']] },
];

const PREFIXES = [
  'Summit',
  'Harbor',
  'Pioneer',
  'Bluepeak',
  'Ironwood',
  'Northstar',
  'Cedar',
  'Keystone',
  'Lumen',
  'Granite',
  'Brightline',
  'Redwood',
  'Atlas',
  'Silverleaf',
  'Clearwater',
  'Evergreen',
  'Copperfield',
  'Riverbend',
  'Trailhead',
  'Oakridge',
  'Meridian',
  'Sterling',
  'Falcon',
  'Horizon',
];

const SUFFIXES: Record<string, string[]> = {
  Software: ['Labs', 'Systems', 'Cloud', 'Software'],
  'IT Services': ['Technologies', 'IT Partners', 'Networks'],
  'Healthcare Services': ['Health', 'Care Group', 'Clinics'],
  Manufacturing: ['Manufacturing', 'Industries', 'Fabrication'],
  Construction: ['Builders', 'Construction', 'Contracting'],
  Logistics: ['Logistics', 'Freight', 'Transport'],
  Retail: ['Outfitters', 'Goods', 'Supply'],
  'Financial Services': ['Capital', 'Financial', 'Advisors'],
  'Marketing Agency': ['Creative', 'Media', 'Digital'],
  Accounting: ['CPAs', 'Accounting', 'Tax Group'],
  'HVAC Services': ['Heating & Air', 'Mechanical', 'Climate Services'],
  Education: ['Academy', 'Learning', 'Institute'],
};

export function generateSeedCompanies(): SeedCompany[] {
  const rand = rng(20261011);
  const pick = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(rand() * items.length)];
    if (item === undefined) throw new Error('pick() requires a non-empty list');
    return item;
  };
  const chance = (p: number) => rand() < p;
  const usedNames = new Set<string>();

  return Array.from({ length: COUNT }, (_, i) => {
    const industry = pick(INDUSTRIES);
    let name: string;
    do {
      name = `${pick(PREFIXES)} ${pick(SUFFIXES[industry] ?? ['Group'])}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    let roll = rand() * LOCATIONS.reduce((s, l) => s + l.weight, 0);
    const location = LOCATIONS.find((l) => (roll -= l.weight) < 0) ?? pick(LOCATIONS);
    const [city, state] = pick(location.places);

    // Log-uniform headcount between ~3 and ~3,000.
    const employeeCount = Math.round(Math.exp(1 + rand() * 7));
    const revenuePerHead = 60_000 + rand() * 190_000;
    const estimatedRevenue = Math.round((employeeCount * revenuePerHead) / 10_000) * 10_000;

    const slug = name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '');
    const hasDomain = !chance(0.05);
    const hasRevenue = !chance(0.18);

    return {
      sourceRecordId: `seed-${String(i + 1).padStart(4, '0')}`,
      name,
      domain: hasDomain ? `${slug}.example.com` : null,
      industry: chance(0.08) ? null : industry,
      city: chance(0.1) ? null : city,
      state: chance(0.1) ? null : state,
      country: chance(0.06) ? null : location.country,
      employeeCount: chance(0.12) ? null : employeeCount,
      estimatedRevenue: hasRevenue ? estimatedRevenue : null,
      revenueSource: hasRevenue ? (chance(0.8) ? 'ai_estimate' : 'public_filing') : null,
      attributes: {
        linkedinUrl: chance(0.25) ? null : `https://www.linkedin.com/company/${slug}-example`,
        description: `${name} is a synthetic ${industry.toLowerCase()} company used for demo data.`,
        foundedYear: chance(0.3) ? null : 1975 + Math.floor(rand() * 48),
      },
    };
  });
}

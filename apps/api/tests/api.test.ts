import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { DEFAULT_CRITERIA, type Criteria } from '../src/domain/scoring/criteria.js';
import { resetDemoUserCache } from '../src/middleware/demo-user.js';

const app = createApp();
const api = '/api/v1';

const criteria: Criteria = {
  industry: { weight: 5, strict: false, values: ['Software'] },
  location: { weight: 5, strict: true, values: ['United States'] },
  size: { weight: 5, strict: false, min: 10, max: 100 },
  revenue: { weight: 0, strict: false, min: null, max: null },
  completeness: { weight: 0 },
};

const ids: Record<'fit' | 'foreign' | 'unknownCountry' | 'noDomain', string> = {
  fit: '',
  foreign: '',
  unknownCountry: '',
  noDomain: '',
};

beforeAll(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE queue_items, user_preferences, companies, users RESTART IDENTITY CASCADE',
  );
  resetDemoUserCache();
  await prisma.user.create({ data: { email: 'api-test@seq.local' } });

  const make = (name: string, data: object) =>
    prisma.company.create({
      data: { name, source: 'test', sourceRecordId: name, domain: `${name}.test`, ...data },
    });
  ids.fit = (
    await make('alpha', { industry: 'Software', country: 'United States', employeeCount: 50 })
  ).id;
  ids.foreign = (
    await make('bravo', { industry: 'Software', country: 'Germany', employeeCount: 50 })
  ).id;
  ids.unknownCountry = (await make('charlie', { industry: 'Software', employeeCount: 50 })).id;
  ids.noDomain = (
    await make('delta', {
      industry: 'Retail',
      country: 'United States',
      employeeCount: 900,
      domain: null,
    })
  ).id;
});

beforeEach(async () => {
  await prisma.queueItem.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('health and errors', () => {
  it('reports health and echoes a valid request id', async () => {
    const res = await request(app).get(`${api}/health`).set('x-request-id', 'abc-123');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('abc-123');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns a consistent error envelope for unknown routes', async () => {
    const res = await request(app).get(`${api}/nope`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .put(`${api}/preferences`)
      .set('content-type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('preferences', () => {
  it('validates and persists criteria', async () => {
    const invalid = await request(app)
      .put(`${api}/preferences`)
      .send({ criteria: { ...criteria, size: { ...criteria.size, min: 500, max: 1 } } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const saved = await request(app).put(`${api}/preferences`).send({ criteria });
    expect(saved.status).toBe(200);

    const read = await request(app).get(`${api}/preferences`);
    expect(read.body).toMatchObject({ criteria, isDefault: false });
  });
});

describe('ranking', () => {
  beforeEach(async () => {
    await request(app).put(`${api}/preferences`).send({ criteria });
  });

  it('ranks qualified first, then needs-review, then disqualified', async () => {
    const res = await request(app).get(`${api}/leads/ranked`);
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { company: { name: string } }) => i.company.name)).toEqual([
      'alpha',
      'delta',
      'charlie',
      'bravo',
    ]);
    expect(res.body.summary).toMatchObject({ high: 1, needs_review: 1, disqualified: 1, total: 4 });
  });

  it('paginates without changing global rank', async () => {
    const res = await request(app).get(`${api}/leads/ranked?page=2&pageSize=2`);
    expect(res.body.items.map((i: { rank: number }) => i.rank)).toEqual([3, 4]);
    expect(res.body.total).toBe(4);
  });

  it('filters by priority and rejects unknown values', async () => {
    const ok = await request(app).get(`${api}/leads/ranked?priority=disqualified`);
    expect(ok.body.items).toHaveLength(1);
    const bad = await request(app).get(`${api}/leads/ranked?priority=urgent`);
    expect(bad.status).toBe(400);
  });

  it('previews a config without saving it', async () => {
    const preview = await request(app)
      .post(`${api}/scoring/preview`)
      .send({ criteria: { ...criteria, location: { ...criteria.location, strict: false } } });
    expect(preview.status).toBe(200);
    expect(preview.body.summary.disqualified).toBe(0);

    const stored = await request(app).get(`${api}/preferences`);
    expect(stored.body.criteria.location.strict).toBe(true);
  });

  it('rejects page sizes above the limit', async () => {
    const res = await request(app).get(`${api}/leads/ranked?pageSize=1000`);
    expect(res.status).toBe(400);
  });

  it('rejects sort keys that are not on the whitelist', async () => {
    const res = await request(app).get(`${api}/companies?sort=password`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('exports ranked leads as CSV and neutralises spreadsheet formulas', async () => {
    await prisma.company.create({
      data: {
        name: '=HYPERLINK("http://evil.example")',
        source: 'test',
        sourceRecordId: 'formula-name',
        domain: 'formula.test',
        industry: 'Software',
        country: 'United States',
        employeeCount: 50,
      },
    });
    const res = await request(app).get(`${api}/leads/export`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toMatch(/^rank,company,domain/);
    expect(res.text).toContain("'=HYPERLINK");
  });
});

describe('queue', () => {
  it('adds items and reports duplicates and unknown ids explicitly', async () => {
    const first = await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: [ids.fit, ids.noDomain] });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ added: 2, duplicates: 0 });

    const missing = '11111111-1111-4111-8111-111111111111';
    const second = await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: [ids.fit, missing] });
    expect(second.status).toBe(200);
    expect(second.body.results).toEqual([
      { companyId: ids.fit, outcome: 'duplicate' },
      { companyId: missing, outcome: 'not_found' },
    ]);

    const queue = await request(app).get(`${api}/queue`);
    expect(queue.body.items).toHaveLength(2);
    expect(queue.body.summary).toMatchObject({ plannedCredits: 2, simulated: true });
  });

  it('paginates the queue while the summary still counts every item', async () => {
    await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: [ids.fit, ids.foreign, ids.unknownCountry] });
    const page2 = await request(app).get(`${api}/queue?page=2&pageSize=2`);
    expect(page2.body).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.summary.total).toBe(3);
    expect((await request(app).get(`${api}/queue?pageSize=500`)).status).toBe(400);
  });

  it('rejects invalid ids', async () => {
    const res = await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: ['nope'] });
    expect(res.status).toBe(400);
  });

  it('enforces status transitions', async () => {
    await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: [ids.fit] });
    const [item] = (await request(app).get(`${api}/queue`)).body.items;

    const skip = await request(app)
      .patch(`${api}/queue/items/${item.id}`)
      .send({ status: 'skipped' });
    expect(skip.body.status).toBe('skipped');

    const bad = await request(app)
      .patch(`${api}/queue/items/${item.id}`)
      .send({ status: 'enriched' });
    expect(bad.status).toBe(409);
    expect(bad.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('simulates enrichment: domain-less leads fail, others enrich and use credits', async () => {
    await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: [ids.fit, ids.noDomain] });
    const res = await request(app).post(`${api}/queue/enrich`).send({});
    expect(res.body).toMatchObject({ enriched: 1, failed: 1, creditsUsed: 1, simulated: true });

    const queue = await request(app).get(`${api}/queue`);
    expect(queue.body.summary.byStatus).toMatchObject({ enriched: 1, failed: 1, queued: 0 });
    expect(queue.body.summary.creditsUsed).toBe(1);
  });

  it('deletes items and 404s on a second delete', async () => {
    await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: [ids.fit] });
    const [item] = (await request(app).get(`${api}/queue`)).body.items;
    expect((await request(app).delete(`${api}/queue/items/${item.id}`)).status).toBe(204);
    expect((await request(app).delete(`${api}/queue/items/${item.id}`)).status).toBe(404);
  });

  it('treats a same-status PATCH as a no-op and rejects unsupported fields', async () => {
    await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: [ids.fit] });
    const [item] = (await request(app).get(`${api}/queue`)).body.items;

    const same = await request(app)
      .patch(`${api}/queue/items/${item.id}`)
      .send({ status: 'queued' });
    expect(same.status).toBe(200);

    const extra = await request(app)
      .patch(`${api}/queue/items/${item.id}`)
      .send({ status: 'skipped', estimatedCredits: 0 });
    expect(extra.status).toBe(400);
  });

  it('reports exactly one insert when the same company is added concurrently', async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post(`${api}/queue/items`)
          .send({ companyIds: [ids.fit] }),
      ),
    );
    const added = responses.reduce((sum, r) => sum + (r.body.added as number), 0);
    const duplicates = responses.reduce((sum, r) => sum + (r.body.duplicates as number), 0);
    expect({ added, duplicates }).toEqual({ added: 1, duplicates: 4 });
    expect(await prisma.queueItem.count()).toBe(1);
  });

  it('exports the queue as CSV', async () => {
    await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: [ids.fit] });
    const res = await request(app).get(`${api}/queue/export`);
    expect(res.headers['content-disposition']).toMatch(/enrichment-queue-.*\.csv/);
    expect(res.text).toContain('alpha');
    expect(res.text.split('\r\n')[0]).toMatch(/queue_status,status_reason,estimated_credits/);
  });
});

describe('ownership', () => {
  it("never reads or mutates another user's queue items", async () => {
    const other = await prisma.user.upsert({
      where: { email: 'someone-else@seq.local' },
      update: {},
      create: { email: 'someone-else@seq.local' },
    });
    const foreignItem = await prisma.queueItem.create({
      data: { userId: other.id, companyId: ids.fit, estimatedCredits: 1 },
    });

    const list = await request(app).get(`${api}/queue`);
    expect(list.body.items).toHaveLength(0);

    const patch = await request(app)
      .patch(`${api}/queue/items/${foreignItem.id}`)
      .send({ status: 'skipped' });
    expect(patch.status).toBe(404);
    expect((await request(app).delete(`${api}/queue/items/${foreignItem.id}`)).status).toBe(404);

    const enrich = await request(app)
      .post(`${api}/queue/enrich`)
      .send({ itemIds: [foreignItem.id] });
    expect(enrich.body).toMatchObject({ enriched: 0, failed: 0 });

    const untouched = await prisma.queueItem.findUniqueOrThrow({ where: { id: foreignItem.id } });
    expect(untouched.status).toBe('queued');

    // The same company is still independently queueable by the demo user.
    const add = await request(app)
      .post(`${api}/queue/items`)
      .send({ companyIds: [ids.fit] });
    expect(add.body.added).toBe(1);
  });
});

describe('database invariants', () => {
  it('enforces unique (user, company) queue items at the database level', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'api-test@seq.local' } });
    await prisma.queueItem.create({
      data: { userId: user.id, companyId: ids.fit, estimatedCredits: 1 },
    });
    await expect(
      prisma.queueItem.create({
        data: { userId: user.id, companyId: ids.fit, estimatedCredits: 1 },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects queue items for unknown companies (foreign key)', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'api-test@seq.local' } });
    await expect(
      prisma.queueItem.create({
        data: {
          userId: user.id,
          companyId: '11111111-1111-4111-8111-111111111111',
          estimatedCredits: 1,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects negative company metrics and credits (check constraints)', async () => {
    await expect(
      prisma.company.create({
        data: { name: 'neg', source: 'test', sourceRecordId: 'neg', employeeCount: -1 },
      }),
    ).rejects.toThrow(/companies_employee_count_non_negative/);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'api-test@seq.local' } });
    await expect(
      prisma.queueItem.create({
        data: { userId: user.id, companyId: ids.foreign, estimatedCredits: -1 },
      }),
    ).rejects.toThrow(/queue_items_estimated_credits_non_negative/);
  });
});

describe('company detail', () => {
  it('returns scoring and 404s for unknown ids', async () => {
    await request(app).put(`${api}/preferences`).send({ criteria: DEFAULT_CRITERIA });
    const ok = await request(app).get(`${api}/companies/${ids.fit}`);
    expect(ok.body.company.name).toBe('alpha');
    expect(ok.body.scoring.score).not.toBeNull();
    const missing = await request(app).get(`${api}/companies/11111111-1111-4111-8111-111111111111`);
    expect(missing.status).toBe(404);
  });
});

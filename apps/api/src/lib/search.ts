import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env.js';

const url = env.ELASTICSEARCH_URL;
const client = url ? new Client({ node: url }) : undefined;
const INDEX = 'emails-v1';
let initialized: Promise<void> | undefined;

export function ensureSearchIndex() {
  if (!client) return Promise.resolve();
  initialized ??= (async () => {
    const exists = await client.indices.exists({ index: INDEX });
    if (!exists) {
      await client.indices.create({
        index: INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            user_id: { type: 'keyword' },
            sender: { type: 'keyword' },
            recipient: { type: 'keyword' },
            subject: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 512 } } },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduled_at: { type: 'date' },
            sent_at: { type: 'date' }
          }
        }
      });
    }
  })();
  return initialized;
}

export async function indexEmail(email: Record<string, unknown>) {
  if (!client) return;
  try {
    await ensureSearchIndex();
    await client.index({ index: INDEX, id: String(email.id), document: email, refresh: false });
  } catch (error) {
    console.error('Elasticsearch indexing failed', error);
  }
}

export async function searchEmails(userId: string, query: string, limit = 50) {
  if (!client) return null;
  try {
    await ensureSearchIndex();
    const escaped = query.toLowerCase().replace(/[\\*?]/g, '\\$&');
    const result = await client.search({
      index: INDEX,
      size: limit,
      query: {
        bool: {
          filter: [{ term: { user_id: userId } }],
          should: [
            { wildcard: { recipient: { value: `*${escaped}*`, case_insensitive: true } } },
            { wildcard: { 'subject.keyword': { value: `*${escaped}*`, case_insensitive: true } } },
            { match: { body: { query, fuzziness: 'AUTO' } } }
          ],
          minimum_should_match: 1
        }
      },
      sort: [{ scheduled_at: { order: 'desc' } }]
    });
    return result.hits.hits.map((hit) => hit._source as Record<string, unknown>);
  } catch (error) {
    console.error('Elasticsearch search failed; using PostgreSQL fallback', error);
    return null;
  }
}

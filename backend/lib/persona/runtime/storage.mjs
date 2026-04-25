import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, nowIso, readJson, slugify, writeJson, writeText } from './lib/utils.mjs';

function exactPersonaSlug(value) {
  const raw = String(value || '').trim();
  const slug = slugify(raw);
  return raw && raw === slug ? slug : '';
}

export class FsStore {
  constructor(config) {
    this.config = config;
  }

  personaRoot() {
    return path.join(this.config.dataDir, 'personas');
  }

  personaDir(slug) {
    return path.join(this.personaRoot(), slug);
  }

  uploadsDir(slug) {
    return path.join(this.personaDir(slug), 'uploads');
  }

  sessionsDir(slug) {
    return path.join(this.personaDir(slug), 'sessions');
  }

  evaluationsDir(slug) {
    return path.join(this.personaDir(slug), 'evaluations');
  }

  async init() {
    await ensureDir(this.personaRoot());
    await ensureDir(this.config.tmpDir);
  }

  async savePersonaBundle(bundle) {
    const slug = bundle.persona.mentor.slug;
    const dir = this.personaDir(slug);
    await ensureDir(dir);
    await ensureDir(this.uploadsDir(slug));
    await ensureDir(this.sessionsDir(slug));
    await ensureDir(this.evaluationsDir(slug));

    await writeJson(path.join(dir, 'input.json'), bundle.input);
    await writeJson(path.join(dir, 'sources.json'), bundle.sources);
    await writeJson(path.join(dir, 'chunks.json'), bundle.chunks);
    await writeJson(path.join(dir, 'persona.json'), bundle.persona);
    await writeText(path.join(dir, 'agent-card.md'), bundle.agentCard);
  }

  async loadPersonaBundle(slugOrName) {
    const slug = exactPersonaSlug(slugOrName);
    if (!slug) {
      return {
        input: null,
        sources: [],
        chunks: [],
        persona: null,
        agentCard: ''
      };
    }
    const dir = this.personaDir(slug);
    return {
      input: await readJson(path.join(dir, 'input.json')),
      sources: await readJson(path.join(dir, 'sources.json'), []),
      chunks: await readJson(path.join(dir, 'chunks.json'), []),
      persona: await readJson(path.join(dir, 'persona.json')),
      agentCard: await fs.readFile(path.join(dir, 'agent-card.md'), 'utf8').catch(() => '')
    };
  }

  async listPersonas() {
    await this.init();
    const entries = await fs.readdir(this.personaRoot(), { withFileTypes: true }).catch(() => []);
    const items = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const persona = await readJson(path.join(this.personaDir(entry.name), 'persona.json'));
      if (!persona) continue;
      items.push({
        slug: persona.mentor.slug,
        name: persona.mentor.name,
        affiliation: persona.mentor.affiliation,
        updatedAt: persona.updatedAt || persona.createdAt
      });
    }
    return items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  async saveSessionTurn(slugOrName, sessionId, turn) {
    const slug = exactPersonaSlug(slugOrName);
    if (!slug) throw new Error('Exact persona slug is required');
    const filePath = path.join(this.sessionsDir(slug), `${sessionId}.json`);
    const session = (await readJson(filePath, { sessionId, createdAt: nowIso(), turns: [] })) || { sessionId, createdAt: nowIso(), turns: [] };
    session.updatedAt = nowIso();
    session.turns.push(turn);
    await writeJson(filePath, session);
    return session;
  }

  async loadSession(slugOrName, sessionId) {
    const slug = exactPersonaSlug(slugOrName);
    if (!slug) return { sessionId, turns: [] };
    return readJson(path.join(this.sessionsDir(slug), `${sessionId}.json`), { sessionId, turns: [] });
  }

  async saveEvaluation(slugOrName, report) {
    const slug = exactPersonaSlug(slugOrName);
    if (!slug) throw new Error('Exact persona slug is required');
    const filePath = path.join(this.evaluationsDir(slug), `${report.id}.json`);
    await writeJson(filePath, report);
    return filePath;
  }
}

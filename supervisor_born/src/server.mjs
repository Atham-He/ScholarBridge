import path from 'node:path';
import fs from 'node:fs/promises';
import { loadConfig } from './config.mjs';
import { createLlmProvider } from './providers/llm.mjs';
import { parseBoolean, parseLines, parseJsonLoose } from './lib/utils.mjs';
import { FsStore } from './storage.mjs';
import { buildPersonaWorkflow } from './workflows/buildPersona.mjs';
import { updatePersonaWorkflow } from './workflows/updatePersona.mjs';
import { chatPersonaWorkflow } from './workflows/chatPersona.mjs';
import { evaluateStudentWorkflow } from './workflows/evaluateStudent.mjs';

async function createApp() {
  const expressModule = await import('express');
  const multerModule = await import('multer');

  const express = expressModule.default;
  const multer = multerModule.default;
  const config = await loadConfig();
  const llmProvider = createLlmProvider(config);
  const store = new FsStore(config);
  await store.init();
  await fs.mkdir(config.tmpDir, { recursive: true });

  const upload = multer({ dest: config.tmpDir });
  const app = express();

  app.use(express.json({ limit: '20mb' }));
  app.use(express.static(path.join(process.cwd(), 'public')));

  app.get('/api/health', async (_req, res) => {
    res.json({ ok: true, provider: llmProvider.kind });
  });

  app.get('/api/personas', async (_req, res, next) => {
    try {
      const items = await store.listPersonas();
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/personas/:slug', async (req, res, next) => {
    try {
      const bundle = await store.loadPersonaBundle(req.params.slug);
      if (!bundle.persona) {
        res.status(404).json({ error: 'Persona not found' });
        return;
      }
      res.json(bundle.persona);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/personas/:slug/agent-card', async (req, res, next) => {
    try {
      const bundle = await store.loadPersonaBundle(req.params.slug);
      if (!bundle.persona) {
        res.status(404).json({ error: 'Persona not found' });
        return;
      }
      res.type('text/markdown').send(bundle.agentCard);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/personas/build', upload.array('files', 20), async (req, res, next) => {
    try {
      const files = req.files || [];
      const publicUrls = [
        ...parseLines(req.body.publicUrls),
        ...parseJsonLoose(req.body.publicUrlsJson, [])
      ].filter(Boolean);

      const input = {
        name: req.body.name,
        affiliation: req.body.affiliation || '',
        title: req.body.title || '',
        authorizedBy: req.body.authorizedBy,
        consentNotes: req.body.consentNotes || '',
        publicUrls,
        projectText: req.body.projectText || '',
        uploadPaths: files.map((file) => ({
          path: file.path,
          originalName: file.originalname,
          mimeType: file.mimetype
        })),
        skipPublicSearch: parseBoolean(req.body.skipPublicSearch),
        disableOpenAlex: parseBoolean(req.body.disableOpenAlex)
      };

      const result = await buildPersonaWorkflow({ input, config, store, llmProvider });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/personas/:slug/update', upload.array('files', 20), async (req, res, next) => {
    try {
      const files = req.files || [];
      const publicUrls = [
        ...parseLines(req.body.publicUrls),
        ...parseJsonLoose(req.body.publicUrlsJson, [])
      ].filter(Boolean);

      const input = {
        name: req.body.name || '',
        affiliation: req.body.affiliation || '',
        title: req.body.title || '',
        authorizedBy: req.body.authorizedBy || '',
        consentNotes: req.body.consentNotes || '',
        publicUrls,
        projectText: req.body.projectText || '',
        uploadPaths: files.map((file) => ({
          path: file.path,
          originalName: file.originalname,
          mimeType: file.mimetype
        })),
        skipPublicSearch: parseBoolean(req.body.skipPublicSearch),
        disableOpenAlex: parseBoolean(req.body.disableOpenAlex)
      };

      const result = await updatePersonaWorkflow({
        slug: req.params.slug,
        input,
        config,
        store,
        llmProvider
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/personas/:slug/chat', async (req, res, next) => {
    try {
      const result = await chatPersonaWorkflow({
        slugOrName: req.params.slug,
        message: req.body.message,
        sessionId: req.body.sessionId,
        studentProfile: req.body.studentProfile,
        store,
        llmProvider
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/personas/:slug/evaluate', async (req, res, next) => {
    try {
      const result = await evaluateStudentWorkflow({
        slugOrName: req.params.slug,
        studentProfile: req.body.studentProfile || {},
        transcript: req.body.transcript,
        sessionId: req.body.sessionId,
        store,
        llmProvider
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  });

  return { app, config };
}

const { app, config } = await createApp();
app.listen(config.port, () => {
  console.log(`supervisor_born listening on http://localhost:${config.port}`);
});

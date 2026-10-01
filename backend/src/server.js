import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import multer from 'multer';
import { CarPhoto, Dialogue, Playlist, Section, VisitorMessage, VisitCounter } from './models.js';
import { seedInitialContent } from './seedData.js';

dotenv.config({ path: '../.env' });

const app = express();
const port = Number(process.env.PORT || 5000);
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DATABASE || 'personalwebsite';

app.use(cors());
app.use(express.json({ limit: '10kb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 2, fields: 10 } });
const loginAttempts = new Map();
app.post('/api/visits', async (_request, response, next) => {
  try {
    await VisitCounter.findOneAndUpdate(
      { key: 'website' },
      { $inc: { count: 1 }, $setOnInsert: { key: 'website' } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );
    return response.status(204).end();
  } catch (error) { return next(error); }
});

const encode = (value) => Buffer.from(value).toString('base64url');
function signToken(payload) {
  const body = encode(JSON.stringify(payload));
  return `${body}.${createHmac('sha256', process.env.ADMIN_TOKEN_SECRET).update(body).digest('base64url')}`;
}
function requireAdmin(request, response, next) {
  const token = request.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !process.env.ADMIN_TOKEN_SECRET) return response.sendStatus(401);
  const [body, signature] = token.split('.');
  if (!body || !signature) return response.sendStatus(401);
  const expected = createHmac('sha256', process.env.ADMIN_TOKEN_SECRET).update(body).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return response.sendStatus(401); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return response.sendStatus(401);
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now() || payload.username !== process.env.ADMIN_USERNAME) return response.sendStatus(401);
  } catch { return response.sendStatus(401); }
  return next();
}

app.post('/api/admin/login', (request, response) => {
  const now = Date.now();
  const ip = request.ip;
  const attempts = (loginAttempts.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (attempts.length >= 5) return response.status(429).json({ error: 'Too many attempts. Try again later.' });
  const username = typeof request.body?.username === 'string' ? request.body.username : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  const [scheme, salt, hash] = (process.env.ADMIN_PASSWORD_HASH || '').split(':');
  let valid = false;
  if (scheme === 'scrypt' && salt && hash && process.env.ADMIN_USERNAME && process.env.ADMIN_TOKEN_SECRET) {
    const derived = scryptSync(password, salt, Buffer.from(hash, 'hex').length);
    const expected = Buffer.from(hash, 'hex');
    valid = username === process.env.ADMIN_USERNAME && derived.length === expected.length && timingSafeEqual(derived, expected);
  }
  if (!valid) {
    attempts.push(now);
    loginAttempts.set(ip, attempts);
    return response.status(401).json({ error: 'Invalid username or password.' });
  }
  loginAttempts.delete(ip);
  return response.json({ token: signToken({ username, exp: now + 12 * 60 * 60 * 1000 }) });
});

app.get('/api/admin/messages', requireAdmin, async (_request, response, next) => {
  try {
    const messages = await VisitorMessage.find().sort({ createdAt: -1 }).lean();
    return response.json(messages.map(({ _id, name, message, createdAt }) => ({ id: _id.toString(), name: name || '', message, createdAt })));
  } catch (error) { return next(error); }
});

app.get('/api/admin/visits', requireAdmin, async (_request, response, next) => {
  try {
    const counter = await VisitCounter.findOne({ key: 'website' }).select('count').lean();
    return response.json({ count: counter?.count || 0 });
  } catch (error) { return next(error); }
});

app.post('/api/admin/sections', requireAdmin, async (request, response, next) => {
  try {
    const title = typeof request.body?.title === 'string' ? request.body.title.trim() : '';
    if (!title || title.length > 60) return response.status(400).json({ error: 'Section name must be 1 to 60 characters.' });
    const key = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    if (!key) return response.status(400).json({ error: 'Use a section name with letters or numbers.' });
    if (await Section.exists({ key })) return response.status(409).json({ error: 'A section with that name already exists.' });
    const section = await Section.create({ key, title, order: (await Section.findOne().sort({ order: -1 }).select('order').lean())?.order + 1 || 0 });
    return response.status(201).json({ key: section.key, title: section.title, order: section.order });
  } catch (error) { return next(error); }
});

app.patch('/api/admin/sections/:key', requireAdmin, async (request, response, next) => {
  try {
    const title = typeof request.body?.title === 'string' ? request.body.title.trim() : '';
    if (!title || title.length > 60) return response.status(400).json({ error: 'Section title must be 1 to 60 characters.' });
    const section = await Section.findOneAndUpdate({ key: request.params.key }, { title }, { returnDocument: 'after', runValidators: true });
    if (!section) return response.sendStatus(404);
    return response.json({ key: section.key, title: section.title, order: section.order });
  } catch (error) { return next(error); }
});

app.delete('/api/admin/playlists/:slug', requireAdmin, async (request, response, next) => {
  try {
    const deleted = await Playlist.findOneAndDelete({ slug: request.params.slug });
    return deleted ? response.sendStatus(204) : response.sendStatus(404);
  } catch (error) { return next(error); }
});

app.delete('/api/admin/dialogues/:id', requireAdmin, async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) return response.sendStatus(404);
    const deleted = await Dialogue.findByIdAndDelete(request.params.id);
    return deleted ? response.sendStatus(204) : response.sendStatus(404);
  } catch (error) { return next(error); }
});

app.delete('/api/admin/photos/:slug', requireAdmin, async (request, response, next) => {
  try {
    const deleted = await CarPhoto.findOneAndDelete({ slug: request.params.slug });
    return deleted ? response.sendStatus(204) : response.sendStatus(404);
  } catch (error) { return next(error); }
});

app.post('/api/admin/playlists', requireAdmin, async (request, response, next) => {
  try {
    const title = typeof request.body?.title === 'string' ? request.body.title.trim() : '';
    const rawUrl = typeof request.body?.url === 'string' ? request.body.url.trim() : '';
    let parsed;
    try { parsed = new URL(rawUrl); } catch { return response.status(400).json({ error: 'Enter a valid Spotify playlist URL.' }); }
    const match = parsed.hostname === 'open.spotify.com' && parsed.pathname.match(/^\/(?:embed\/)?playlist\/([A-Za-z0-9]+)\/?$/);
    if (!match || !title || title.length > 100) return response.status(400).json({ error: 'Enter a playlist URL and a title.' });
    const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || `playlist-${Date.now()}`;
    if (await Playlist.exists({ slug })) return response.status(409).json({ error: 'A playlist with that title already exists.' });
    const playlist = await Playlist.create({ slug, title, embedUrl: `https://open.spotify.com/embed/playlist/${match[1]}`, order: await Playlist.countDocuments() });
    return response.status(201).json({ slug: playlist.slug, title: playlist.title, embedUrl: playlist.embedUrl });
  } catch (error) { return next(error); }
});

app.post('/api/admin/dialogues', requireAdmin, async (request, response, next) => {
  try {
    const text = typeof request.body?.text === 'string' ? request.body.text.trim() : '';
    if (!text || text.length > 1000) return response.status(400).json({ error: 'Dialogue must be 1 to 1000 characters.' });
    const dialogue = await Dialogue.create({ text, order: await Dialogue.countDocuments() });
    return response.status(201).json({ id: dialogue._id.toString(), text: dialogue.text });
  } catch (error) { return next(error); }
});

app.post('/api/admin/photos', requireAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (request, response, next) => {
  try {
    const image = request.files?.image?.[0];
    const thumbnail = request.files?.thumbnail?.[0];
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
    if (!image || !thumbnail || !name || name.length > 100 || !allowed.has(image.mimetype) || !allowed.has(thumbnail.mimetype)) {
      return response.status(400).json({ error: 'Provide a name and supported image files.' });
    }
    const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || `photo-${Date.now()}`;
    if (await CarPhoto.exists({ slug })) return response.status(409).json({ error: 'A photo with that name already exists.' });
    const dimensions = (prefix) => ({ width: Math.max(1, Math.min(20000, Number(request.body[`${prefix}Width`]) || 1)), height: Math.max(1, Math.min(20000, Number(request.body[`${prefix}Height`]) || 1)) });
    const photo = await CarPhoto.create({ slug, name, order: await CarPhoto.countDocuments(), thumbnail: { data: thumbnail.buffer, contentType: thumbnail.mimetype, ...dimensions('thumbnail') }, full: { data: image.buffer, contentType: image.mimetype, ...dimensions('image') } });
    return response.status(201).json({ slug: photo.slug, name: photo.name });
  } catch (error) { return next(error); }
});

app.get('/api/health', (_request, response) => {
  response.json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'connecting' });
});

app.get('/api/content', async (_request, response, next) => {
  try {
    const [playlists, dialogues, cars, sections] = await Promise.all([
      Playlist.find().sort({ order: 1 }).lean(),
      Dialogue.find().sort({ order: 1 }).lean(),
      CarPhoto.find().sort({ order: 1 }).select('slug name order thumbnail.width thumbnail.height full.width full.height').lean(),
      Section.find().sort({ order: 1 }).select('key title order').lean(),
    ]);

    response.json({
      playlists: playlists.map(({ slug, title, embedUrl, order }) => ({ slug, title, embedUrl, order })),
      dialogues: dialogues.map(({ _id, text, order }) => ({ id: _id.toString(), text, order })),
      cars: cars.map(({ slug, name, order, thumbnail, full }) => ({
        slug,
        name,
        order,
        thumbnailWidth: thumbnail.width,
        thumbnailHeight: thumbnail.height,
        fullWidth: full.width,
        fullHeight: full.height,
        thumbnailUrl: `/api/cars/${slug}/thumbnail`,
        fullUrl: `/api/cars/${slug}/full`,
      })),
      sections,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/messages', async (request, response, next) => {
  try {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';

    if (!message) return response.status(400).json({ error: 'Please enter a message.' });
    if (name.length > 100) return response.status(400).json({ error: 'Name must be 100 characters or fewer.' });
    if (message.length > 5000) return response.status(400).json({ error: 'Message must be 5000 characters or fewer.' });

    const savedMessage = await VisitorMessage.create({ name: name || undefined, message });
    return response.status(201).json({ id: savedMessage._id.toString(), status: 'sent' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/cars/:slug/:variant', async (request, response, next) => {
  try {
    if (!['thumbnail', 'full'].includes(request.params.variant)) return response.sendStatus(404);
    const projection = {
      [`${request.params.variant}.data`]: 1,
      [`${request.params.variant}.contentType`]: 1,
    };
    const photo = await CarPhoto.findOne({ slug: request.params.slug }).select(projection);
    if (!photo) return response.sendStatus(404);

    const image = photo[request.params.variant];
    response.set('Content-Type', image.contentType);
    response.set('Cache-Control', 'public, max-age=3600');
    return response.send(image.data);
  } catch (error) {
    return next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  const status = error instanceof multer.MulterError ? 400 : 500;
  response.status(status).json({ error: status === 400 ? 'Photo upload is too large or has too many files.' : 'Unable to load website content.' });
});

async function start() {
  if (!mongoUri) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(mongoUri, { dbName: databaseName });
  await seedInitialContent();
  app.listen(port, '0.0.0.0', () => console.log(`Backend listening on port ${port}`));
}

start().catch((error) => {
  console.error('Backend startup failed:', error.message);
  process.exit(1);
});

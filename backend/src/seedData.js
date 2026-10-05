import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CarPhoto, Dialogue, Playlist, Section } from './models.js';

const asset = (path) => fileURLToPath(new URL(`../seed-assets/${path}`, import.meta.url));

export async function seedInitialContent() {
  const legacySection = await Section.findOne({ key: 'songs-on-loop' });
  const currentSection = await Section.findOne({ key: 'gaana-bajao' });

  if (legacySection && !currentSection) {
    legacySection.key = 'gaana-bajao';
    legacySection.title = 'Gaana Bajao';
    await legacySection.save();
  } else if (legacySection && currentSection) {
    await Section.deleteOne({ _id: legacySection._id });
    await Section.updateOne({ _id: currentSection._id }, { $set: { title: 'Gaana Bajao' } });
  }

  if (await Section.countDocuments() === 0) {
    await Section.insertMany([
      { key: 'gaana-bajao', title: 'Gaana Bajao', order: 0 },
      { key: 'clicks', title: 'Clicks', order: 1 },
      { key: 'dialogues', title: 'Dialogues', order: 2 },
      { key: 'connect', title: 'Connect', order: 3 },
      { key: 'links', title: 'Links', order: 4 },
    ]);
  }
  if (await Playlist.countDocuments() === 0) {
    await Playlist.insertMany([
      {
        slug: 'on-loop',
        title: 'On Loop',
        embedUrl: 'https://open.spotify.com/embed/playlist/6H3kZi4EBVjhHDq2xGx8Rl?utm_source=generator&si=cd7d4c8ddee54c65',
        order: 0,
      },
      {
        slug: 'millionaire',
        title: 'Millionaire',
        embedUrl: 'https://open.spotify.com/embed/playlist/6S0VJU6pe3ePwOOFeyL95S?utm_source=generator&si=c31328851c03439a',
        order: 1,
      },
    ]);
  }

  if (await Dialogue.countDocuments() === 0) {
    await Dialogue.create({ text: 'Yee Raju ka style hai baabu bhaiya', order: 0 });
  }

  if (await CarPhoto.countDocuments() === 0) {
    const photos = [
      {
        slug: 'range-rover-ambient-lighting',
        name: 'Range Rover Ambient Lighting',
        order: 0,
        thumbnail: {
          path: 'cars/thumbs/Range Rover Ambient Lighting.avif',
          contentType: 'image/avif',
          width: 640,
          height: 1138,
        },
        full: {
          path: 'cars/full/Range Rover Ambient Lighting.jpg',
          contentType: 'image/jpeg',
          width: 736,
          height: 1308,
        },
      },
      {
        slug: 'rolls-royce-interior',
        name: 'Rolls-Royce Interior',
        order: 1,
        thumbnail: {
          path: 'cars/thumbs/pexels-redyar-rzgar-1257188192-30054873.avif',
          contentType: 'image/avif',
          width: 640,
          height: 1140,
        },
        full: {
          path: 'cars/full/pexels-redyar-rzgar-1257188192-30054873.jpg',
          contentType: 'image/jpeg',
          width: 3904,
          height: 6960,
        },
      },
    ];

    await CarPhoto.insertMany(await Promise.all(photos.map(async (photo) => ({
      slug: photo.slug,
      name: photo.name,
      order: photo.order,
      thumbnail: {
        data: await readFile(asset(photo.thumbnail.path)),
        contentType: photo.thumbnail.contentType,
        width: photo.thumbnail.width,
        height: photo.thumbnail.height,
      },
      full: {
        data: await readFile(asset(photo.full.path)),
        contentType: photo.full.contentType,
        width: photo.full.width,
        height: photo.full.height,
      },
    }))));
  }
}

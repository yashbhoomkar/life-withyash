# Personal website

The frontend reads playlists, dialogue text, and car photos from the Express API. Connect form submissions, content, and car image bytes are stored in MongoDB. The backend inserts the initial content only when each collection is empty.

Each public website page load increments a MongoDB visit counter. Admin page loads do not count; the total is shown in the admin dashboard.

## Start the website

Make sure Docker Desktop is running. From a terminal, go to the repository's root folder and run:

```sh
./start-website
```

Then open [http://localhost:5173](http://localhost:5173). This single command stops any existing Compose stack, rebuilds the frontend and backend containers, and starts the website in the background. It keeps the MongoDB data volume.

For a new setup, first copy `.env.example` to `.env` and replace `REPLACE_WITH_DB_PASSWORD` in `MONGODB_URI` with the MongoDB Atlas database user's password. URL-encode reserved characters in that password. Keep the `.env` file private. The existing local `.env` already contains this project's settings.

The backend listens on container port 5000, mapped to host port 5001 by default. `GET /api/content` returns playlist, dialogue, and car metadata; car thumbnails and full images are served by `/api/cars/:slug/thumbnail` and `/api/cars/:slug/full`. Connect form submissions are stored with `POST /api/messages`.

Visitor messages are saved to MongoDB and emailed to `bhoomkar04@gmail.com` with the subject `new message on personal website`. To enable email delivery, set `GMAIL_APP_PASSWORD` in the root `.env` to an App Password for that Gmail account, then restart with `./start-website`. Do not commit this value. Messages are still saved if the email service is not configured or temporarily unavailable.

## Admin dashboard

Open `http://localhost:5173/admin` or use **For Yash** at the bottom of the public sidebar. The dashboard is responsive and lets the site owner rename sections, add Spotify playlists by URL, add dialogues, upload photos, and read visitor messages. New content is saved in MongoDB and appears on the public site.

Admin login settings are read from the root `.env`: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `ADMIN_TOKEN_SECRET`. The local `.env` should stay private and is ignored by git. The password is stored as a salted scrypt hash; the dashboard API issues a short lived session token after login. When setting up another environment, create a scrypt hash and a random token secret before starting Compose. Photo uploads are resized in the browser to a 2400 pixel full image and 640 pixel thumbnail before being sent to the backend.

To use the local MongoDB container instead of Atlas, unset `MONGODB_URI` in the environment or `.env`; Compose then uses its local MongoDB service.

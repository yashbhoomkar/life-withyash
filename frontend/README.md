# Life With Yash frontend

The frontend and backend run as separate local Docker services.

## Start locally

Make sure Docker Desktop is running. Start the backend first:

```sh
cd ../backend
./start-backend
```

Then start the frontend:

```sh
cd ../frontend
./start-frontend
```

Open [http://localhost:5173](http://localhost:5173). The frontend calls the API at `http://localhost:5001` by default.

## Configuration

Copy `.env.example` to `.env` in this folder if you need to change the frontend port or API URL. For a deployed frontend build, set `VITE_API_BASE_URL` to the public backend URL, for example `https://lifewithyash.onrender.com`.

Backend secrets and MongoDB settings are in [`../backend/.env.example`](../backend/.env.example). Create `backend/.env` from that template and keep it private.

## Admin dashboard

Open `http://localhost:5173/admin` or use **For Yash** at the bottom of the public sidebar. The dashboard manages sections, Spotify playlists, dialogues, photos, and visitor messages stored in MongoDB.

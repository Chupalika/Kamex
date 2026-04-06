# Kamex
A website application for hosting and managing tournaments for osu!, an online rhythm game! Check out the About page on the live website for some more information. This readme will be more technically oriented.

Tech stack: MongoDB (mongoose), Express.js (NestJS), Angular 17, Node.js

## Setup
Requires: Node.js, npm

Install dependencies: `npm install` (in both client/ and server/)

Run: either `run.sh` or:
* Frontend: `ng serve`, then visit [http://localhost:4200](http://localhost:4200)
* Backend: `npm start`

Backend will need an .env file for it to actually work. Here's the format:
```
DEV_MONGO_SRV=<mongodb-url>
OSU_API_V2_URL=https://osu.ppy.sh/api/v2/
OSU_API_V2_TOKEN_URL=https://osu.ppy.sh/oauth/token
OSU_API_V2_CLIENT_ID=<osu-client-id>
OSU_API_V2_CLIENT_SECRET=<osu-client-secret>
DISCORD_CLIENT_ID=<discord-client-id>
DISCORD_CLIENT_SECRET=<discord-client-secret>
DISCORD_BOT_TOKEN=<discord-bot-token>
SESSION_SECRET=<express-session-secret>
APP_OWNER_ID=<osu-id>
CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>
```

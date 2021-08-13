# QuaverPvM API

## Access the API

<https://qpvmapi.icedynamix.moe>

### Routes

- GET /me *requires Login*
- GET /user `{ params: { id: int } }`
- GET /map `{ params: { id: int, rate?: float ?? 1.0 } }`
- GET /map/random `{ params: { min?: int, max?: int } }`
- GET /leaderboard `{ params: { page?: int ?? 0 } }`
- GET /stats
- GET /match `{ params: { id: int } }`
- GET /match/new *requires Login*
- GET /match/ongoing *requires Login*
- POST /match/submit `{ body: { resign?: boolean ?? false } }` *requires Login*
- GET /logout
- GET /auth/quaver

## Deploy locally

- Install MySQL
- Install Redis
- Install project dependencies: `npm i`
- Add environment variables
- Set up database: `npx prisma migrate deploy`
- Build: `npm run build`
- Start: `npm run start`

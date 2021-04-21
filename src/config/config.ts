import dotenv from "dotenv";

dotenv.config();

const config = {
    port: process.env.PORT || 8080,
    databaseUrl: process.env.DATABASE_URL || "",
    mongoOptions: {
        useUnifiedTopology: true,
        useNewUrlParser: true,
        socketTimeoutMS: 30000,
        keepAlive: true,
        poolSize: 50,
        autoIndex: false,
        retryWrites: false,
    },
    apiBaseUrl: process.env.API_BASE_URL || "https://api.quavergame.com",
    quaverBaseUrl: process.env.QUAVER_BASE_URL || "https://quavergame.com",
    selfUrl: process.env.SELF_URL || "http://localhost:8080",
    tau: process.env.GLICKO_TAU ? parseInt(process.env.GLICKO_TAU, 10) : 0.5,
    jwtSecret: process.env.JWT_SECRET || "secret",
};

export default config;

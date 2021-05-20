import logging from "../config/logging";

export default class Middleware {
    public static logRequests(req, res, next) {
        res.on("finish", () => {
            logging.info(`${req.method} ${req.url} - [${res.statusCode}] | User ${req.user?._id ?? null}`);
        });
        next();
    }

    public static handleError(err, req, res, next) {
        logging.error(err, err);
        res.status(500).json({ message: err.message, err });
    }
}

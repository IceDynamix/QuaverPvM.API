import axios from "axios";
import config from "./config/config";
import logging from "./config/logging";

const NAMESPACE: string = "API";

export default class API {
    public static async GET(req: any, endpoint: string, params: object = {}): Promise<any> {
        const token = await API.GetToken(req);

        let headers: any = {};
        let timeout: number = 4000;

        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await axios
            .get(`${config.apiBaseUrl}/${endpoint}`, {
                params: params,
                headers: headers,
                timeout: timeout,
            })
            .catch((e: { response: any }) => {
                logging.error(NAMESPACE, e.response.config.url);
                logging.error(NAMESPACE, e.response.data);
                return e.response;
            });

        return response.data;
    }

    public static async POST(req: any, endpoint: string, data: object = {}): Promise<any> {
        const token = await API.GetToken(req);

        let headers: any = {};

        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await axios
            .post(`${config.apiBaseUrl}/${endpoint}`, data, {
                headers: headers,
            })
            .catch((e: { response: any }) => {
                logging.error(NAMESPACE, e.response.config.url);
                logging.error(NAMESPACE, e.response.data);
                return e.response;
            });

        return response.data;
    }

    static async GetToken(req: any): Promise<string | null> {
        return null;
        // if (!req.user) return null;

        // const token = await Jwt.Sign(
        //     {
        //         user: {
        //             id: req.user.id,
        //             steam_id: req.user.steam_id,
        //             username: req.user.username,
        //             privileges: req.user.privileges,
        //             usergroups: req.user.usergroups,
        //             country: req.user.country,
        //             avatar_url: req.user.avatar_url,
        //         },
        //     },
        //     config.jwtSecret,
        //     "30s"
        // );

        // return token;
    }
}

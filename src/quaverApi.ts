import Requester from "./requester";
import config from "./config";
import { redisGetAsync, redisSetExAsync } from "../server";

export default class QuaverApi {
    public static async getQuaverUser(id: number): Promise<any> {
        if (!id) return null;

        const redisKey = `quaver:user:${id}`;

        const cached = await redisGetAsync(redisKey);
        if (cached) {
            console.info(`Using cached Quaver user data for ${id}`);
            return JSON.parse(cached);
        }

        console.info("Requesting Quaver user data for " + id);
        const response: any = await Requester.GET(`${config.quaverApiBaseUrl}/v1/users/full/${id}`);
        if (response.status != 200) return null;

        await redisSetExAsync(redisKey, 60 * 60, JSON.stringify(response.user));
        console.log(`Saved Quaver user data for ${id} to Redis`);

        return response.user;
    }
}

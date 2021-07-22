import Requester from "./requester";
import config from "./config";

export default class QuaverApi {
    public static async getQuaverUser(id: number): Promise<any> {
        console.info("Requesting Quaver map " + id);
        const response: any = await Requester.GET(`${config.apiBaseUrl}/v1/users/full/${id}`);
        if (response.status != 200) return null;
        return response.user;
    }
}

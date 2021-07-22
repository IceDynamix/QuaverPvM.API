import axios from "axios";

export default class Requester {
    public static async GET(url: string, params: object = {}): Promise<any> {
        let headers: any = {};
        let timeout: number = 4000;

        const response = await axios
            .get(url, {
                params: params,
                headers: headers,
                timeout: timeout,
            })
            .catch((e: { response: any }) => {
                console.error("Error during request", e);
                return e.response;
            });

        return response.data;
    }

    public static async POST(url: string, data: object = {}): Promise<any> {
        let headers: any = {
            "Content-Type": "application/json",
        };

        const response = await axios.post(url, data, { headers }).catch((e: { response: any }) => {
            console.error(e.response.data);
            return e.response;
        });

        return response.data;
    }
}
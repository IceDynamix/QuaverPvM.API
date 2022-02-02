import axios from "axios";

export default class Requester {
    private static maxAttempts = 3;

    public static async GET(url: string, params: object = {}): Promise<any> {
        let headers: any = {};
        let timeout: number = 4000;

        let attempts = 0;

        while (attempts < Requester.maxAttempts) {
            attempts++;
            try {
                const response = await axios.get(url, {
                    params,
                    headers,
                    timeout,
                });
                return response.data;
            } catch (err) {
                if (attempts < Requester.maxAttempts) continue;
                console.error("Error during request", err);
                return err;
            }
        }
    }

    public static async POST(url: string, data: object = {}): Promise<any> {
        let headers: any = {
            "Content-Type": "application/json",
        };

        let attempts = 0;

        while (attempts < Requester.maxAttempts) {
            attempts++;
            try {
                const response = await axios.post(url, data, { headers });
                return response.data;
            } catch (err) {
                if (attempts < Requester.maxAttempts) continue;
                console.error("Error during request", err);
                return err;
            }
        }
    }
}

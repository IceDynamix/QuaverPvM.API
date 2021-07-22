export default class Glicko {
    public static qrToGlicko(qr: number): number {
        qr = Math.max(0, qr);
        return 1.28 * qr * qr + 500;
    }

    public static glickoToQr(glicko: number): number {
        return Math.sqrt(Math.max(0, glicko - 500) / 1.28);
    }
}

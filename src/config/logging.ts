export default class Logging {
    public static info(message: string, object?: any): void {
        this.log(console.info, "INFO", message, object);
    }
    public static warn(message: string, object?: any): void {
        this.log(console.warn, "WARN", message, object);
    }
    public static debug(message: string, object?: any): void {
        this.log(console.debug, "DEBUG", message, object);
    }
    public static error(message: string, object?: any): void {
        this.log(console.error, "ERROR", message, object);
    }

    static getTimeStamp = (): string => new Date().toISOString();
    static log(func: Function, type: string, message: string, object?: any): void {
        const msg = `[${this.getTimeStamp()}] [${type}] ${message}`;
        object ? func(msg, object) : func(msg);
    }
}

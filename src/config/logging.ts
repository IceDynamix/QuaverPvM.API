export default class Logging {
    public static info(namespace: string, message: string, object?: any): void {
        this.log(console.info, "INFO", namespace, message, object);
    }
    public static warn(namespace: string, message: string, object?: any): void {
        this.log(console.warn, "WARN", namespace, message, object);
    }
    public static debug(namespace: string, message: string, object?: any): void {
        this.log(console.debug, "DEBUG", namespace, message, object);
    }
    public static error(namespace: string, message: string, object?: any): void {
        this.log(console.error, "ERROR", namespace, message, object);
    }

    static getTimeStamp = (): string => new Date().toISOString();
    static log(func: Function, type: string, namespace: string, message: string, object?: any): void {
        const msg = `[${this.getTimeStamp()}] [${type}] [${namespace}] ${message}`;
        object ? func(msg, object) : func(msg);
    }
}

import { ConsoleLogger, Injectable } from "@nestjs/common";

@Injectable()
export class DefaultLogger extends ConsoleLogger {
    warn(message: unknown, ...rest: unknown[]): void {
        console.log('Warn Log');
        super.warn(message, ...rest);
    }

    error(message: unknown, ...rest: unknown[]): void {
        console.log('Error Log');
        super.warn(message, ...rest);
    }
}
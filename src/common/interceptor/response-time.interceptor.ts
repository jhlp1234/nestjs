import { CallHandler, ExecutionContext, Injectable, InternalServerErrorException, NestInterceptor } from "@nestjs/common";
import { delay, Observable, tap } from "rxjs";

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();

    const reqTime = Date.now();

    return next.handle()
    .pipe(
      //delay(1000),
      tap(() => {
        const resTime = Date.now();
        const diff = resTime - reqTime;

        // if(diff > 1000){
        //   console.log(`Timeout ${req.method} ${req.path} ${diff}ms`);

        //   throw new InternalServerErrorException('오래걸림');
        // }
        console.log(`${req.method} ${req.path} ${diff}ms`);
      }),
    )
  }
}
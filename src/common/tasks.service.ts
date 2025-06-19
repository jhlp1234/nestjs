import { Inject, Injectable, LoggerService } from "@nestjs/common";
import { Cron, SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Movie } from "src/movie/entity/movie.entity";
import { Repository } from "typeorm";
import { Logger } from "@nestjs/common";
import { DefaultLogger } from "./logger/default.logger";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

@Injectable()
export class TasksService {
    //private readonly logger = new Logger(TasksService.name);

    constructor(
        @InjectRepository(Movie)
        private readonly movieRepository: Repository<Movie>,
        private readonly schedulerRegistry: SchedulerRegistry,
        //private readonly logger: DefaultLogger,
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: LoggerService,
    ){}

    //@Cron('*/5 * * * * *')
    logEverySecond(){
        //this.logger.fatal('Fatal 레벨 로그');
        this.logger.error('Error 레벨 로그', null, TasksService.name);
        this.logger.warn('Warn 레벨 로그', TasksService.name);
        this.logger.log('Log 레벨 로그');
        //this.logger.debug('Debug 레벨 로그');
        //this.logger.verbose('Verbose 레벨 로그');
    }

    //@Cron('0 * * * * *')
    async movieLikeCounts(){
        await this.movieRepository.query(`update movie m set "likeCount" = (select count(*) from movie_user_like mul where m.id = mul."movieId" and mul."isLike" = true)`);
        console.log('업데이트 됨');
    }

    //@Cron('* * * * * *', {name: 'printer'})
    printer(){
        console.log('print every sec');
    }

    //@Cron('*/5 * * * * *')
    stopper(){
        console.log('stopper run');

        const job = this.schedulerRegistry.getCronJob('printer');

        console.log('Last Date');
        console.log(job.lastDate());
        console.log('Next Date');
        console.log(job.nextDate());
        console.log('Next Dates');
        console.log(job.nextDates(5));

        if(job.isActive){
            job.stop();
        } else {
            job.start();
        }
    }
}
import { Module } from "@nestjs/common";
import { CommonService } from "./common.service";
import { CommonController } from './common.controller';
import { MulterModule } from "@nestjs/platform-express";
import { v4 } from "uuid";
import { diskStorage } from "multer";
import { join } from "path";
import { TasksService } from "./tasks.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Movie } from "src/movie/entity/movie.entity";
import { DefaultLogger } from "./logger/default.logger";

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: join(process.cwd(), 'public', 'temp'),
        filename: (req, file, cb) => {
          const fileName = file.originalname.split('.');

          let extension = 'mp4';
          if(fileName.length > 1) extension = fileName[fileName.length - 1];

          cb(null, `${v4()}_${Date.now()}.${extension}`);
        }
      }),
    }),
    TypeOrmModule.forFeature([Movie]),
  ],
  controllers: [CommonController],
  providers: [CommonService, TasksService, DefaultLogger],
  exports: [CommonService, DefaultLogger]
})
export class CommonMoudle {}
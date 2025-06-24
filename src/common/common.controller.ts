import { BadRequestException, Controller, Post, Response, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CommonService } from './common.service';
import { Public } from 'src/auth/decorator/public.decorator';

@Controller('common')
@ApiBearerAuth()
export class CommonController {
  constructor(
    private readonly commonService: CommonService,
  ){}

  @Post('video')
  @UseInterceptors(FileInterceptor('video', {
      limits: {
        fileSize: 20000000
      },
      fileFilter(req, file, cb){
        if(file.mimetype !== 'video/mp4') return cb(new BadRequestException('mp4만'), false);
  
        return cb(null, true);
      }
    }))
  createVideo(@UploadedFile() file: Express.Multer.File){
    
    return {fileName: file.filename,}
  }

  @Public()
  @Post('presigned-url')
  async createPresignedUrl(){
    return {
      url: await this.commonService.createPresignedUrl(),
    }
  }
}

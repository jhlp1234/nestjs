import { ArgumentMetadata, BadRequestException, PipeTransform } from "@nestjs/common";
  import { v4 } from "uuid";
  import { rename } from "fs/promises";
import { join } from "path";

export class MovieFilePipe implements PipeTransform<Express.Multer.File, Promise<Express.Multer.File>> {
  constructor(
    private readonly options: {
      // MB
      maxSize: number,
      mimetype: string,
    }
  ){}

  async transform(value: Express.Multer.File, metadata: ArgumentMetadata): Promise<Express.Multer.File> {
    if(!value) throw new BadRequestException('movie 필수');

    const byteSize = this.options.maxSize * 1000000;
    if(value.size > byteSize) throw new BadRequestException(`${this.options.maxSize}MB 보다 작은거`);

    if(value.mimetype !== this.options.mimetype) throw new BadRequestException(`${this.options.mimetype}만`);
  
    const file = value.originalname.split('.');

    let extension = 'mp4';
    if(file.length > 1) extension = file[file.length - 1];

    const filename = `${v4()}_${Date.now()}.${extension}`;

    const newPath = join(value.destination, filename);

    await rename(value.path, newPath);

    return {
      ...value,
      filename,
      path: newPath,
    }
  }
}
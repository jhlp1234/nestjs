import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class MovieTitleValidationPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if(!value) return value;

    if(value.length <= 2) {
      throw new BadRequestException('제목 3자 이상');
    }

    return value;
  }

}
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";
import { CursorPaginationDto } from "src/common/dto/cursor-pagination.dto";
import { PagePaginationDto } from "src/common/dto/page-pagination.dto";

export class GetMoviesDto extends CursorPaginationDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: '영화 제목',
    example: '테스트'
  })
  title: string;
}
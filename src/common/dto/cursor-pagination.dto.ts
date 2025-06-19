import { Transform, Type } from "class-transformer";
import { IsArray, IsIn, IsInt, IsOptional, IsString } from "class-validator";

export class CursorPaginationDto {

  @IsString()
  @IsOptional()
  cursor?: string;

  @IsArray()
  @IsString({each: true})
  @IsOptional()
  @Transform(({value}) => (Array.isArray(value) ? value : [value]))
  order: string[] = ['id_DESC'];

  @IsInt()
  @IsOptional()
  take: number = 5;
}
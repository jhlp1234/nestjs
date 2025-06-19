//import { PartialType } from "@nestjs/mapped-types";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { CreateMovieDto } from "./create-movie.dto";
import { PartialType } from "@nestjs/swagger";

export class UpdateMovieDto extends PartialType(CreateMovieDto) {

  // @IsNotEmpty()
  // @IsOptional()
  // title?: string;
  
  // @IsArray()
  // @ArrayNotEmpty()
  // @IsNumber({}, { each: true })
  // @IsOptional()
  // genreIds?: number[];

  // @IsNotEmpty()
  // @IsOptional()
  // detail?: string;

  // @IsNotEmpty()
  // @IsOptional()
  // directorId?: number;
}
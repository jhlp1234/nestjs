import { PartialType } from "@nestjs/mapped-types";
import { IsNotEmpty, IsOptional } from "class-validator";
import { CreateGenreDto } from "./create-genre.dto";

export class UpdateGenreDto extends PartialType(CreateGenreDto) {
  
  // @IsNotEmpty()
  // @IsOptional()
  // name?: string;
}

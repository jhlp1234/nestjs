import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsString, registerDecorator, Validate, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

// @ValidatorConstraint()
// class PasswordValidator implements ValidatorConstraintInterface {
//   validate(value: any, validationArguments?: ValidationArguments): Promise<boolean> | boolean {

//     return value.length >= 4 && value.length <= 8;
//   }
//   defaultMessage?(validationArguments?: ValidationArguments): string {
    
//     return '4-8자리, 지금입력: $value';
//   }

// }

// function IsPasswordValid(validationOptions?: ValidationOptions) {

//   return function(object: Object, propertyName: string) {
//     registerDecorator({
//       target: object.constructor,
//       propertyName,
//       options: validationOptions,
//       validator: PasswordValidator
//     });
//   }
// }

export class CreateMovieDto {

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  detail: string;

  @IsNotEmpty()
  @IsNumber()
  directorId: number;
  
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  genreIds: number[];

  @IsString()
  movieFileName: string;
}
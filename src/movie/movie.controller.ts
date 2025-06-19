import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, ClassSerializerInterceptor, ParseIntPipe, BadRequestException, NotFoundException, ParseFloatPipe, DefaultValuePipe, Request, UseGuards, UploadedFile, UploadedFiles, Version } from '@nestjs/common';
import { MovieService } from './movie.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieTitleValidationPipe } from './pipe/movie-title-validation.pipe';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { Public } from 'src/auth/decorator/public.decorator';
import { RBAC } from 'src/auth/decorator/rbac.decorator';
import { Role } from 'src/user/entities/user.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CacheInterceptor } from 'src/common/interceptor/cache.interceptor';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MovieFilePipe } from './pipe/movie-file.pipe';
import { rename } from 'fs/promises';
import { UserId } from 'src/user/decorator/user-id.decorator';
import { QueryRunner } from 'src/common/decorator/query-runner.decorator';
import { QueryRunner as Qr } from 'typeorm';
import {CacheKey, CacheTTL, CacheInterceptor as CI} from '@nestjs/cache-manager';
import { Throttle } from 'src/common/decorator/throttle.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

// @Controller({
//   path: 'movie',
//   version: '2',
// })
// export class MovieControllerV2 {
//   @Get()
//   getMovies(){
//     return 'v2';
//   }
// }

@Controller({
  path: 'movie',
  version: '1',
})
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get()
  @Public()
  @Throttle({
    count: 5,
    unit: 'minute'
  })
  //@UseInterceptors(CacheInterceptor)
  //@Version('4')
  @ApiOperation({
    description: '테스트 설명'
  })
  @ApiResponse({
    status: 200,
    description: '성공했을 때'
  })
  @ApiResponse({
    status: 400,
    description: '데이터를 잘못넣었을 때'
  })
  getMovies(@Query() dto: GetMoviesDto, @UserId() userId?: number) {

    return this.movieService.getMovies(dto, userId);
  }

  @Get('recent')
  @UseInterceptors(CI)
  @CacheKey('getMoviesRecent')
  @CacheTTL(10000)
  getMoviesRecent(){
    console.log('GetMoviesRecent')
    return this.movieService.findRecent();
  }

  @Get(':id')
  @Public()
  getMovie(@Param('id', ParseIntPipe) id: number) {
    
    return this.movieService.getMovie(id);
  }

  @Post()
  @RBAC(Role.admin)
  @UseInterceptors(TransactionInterceptor)
  //@UseInterceptors(FileInterceptor('movie'))
  //@UseGuards(AuthGuard)
  postMovie(@Body() body: CreateMovieDto, @QueryRunner() queryRunner: Qr, @UserId() userId: number) {

    return this.movieService.postMovie(body, queryRunner, userId);
  }

  @Patch('/:id')
  @RBAC(Role.admin)
  patchMovie(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateMovieDto) {
    
    return this.movieService.patchMovie(id, body);
  }

  @Delete('/:id')
  @RBAC(Role.admin)
  deleteMovie(@Param('id', ParseIntPipe) id: number) {
    
    return this.movieService.deleteMovie(id);
  }

  @Post(':id/like')
  createMovieLike(
    @Param('id', ParseIntPipe) movieId: number,
    @UserId() userId: number,
  ){
    return this.movieService.toggleMovieLike(movieId, userId, true);
  }

  @Post(':id/dislike')
  createMovieDislike(
    @Param('id', ParseIntPipe) movieId: number,
    @UserId() userId: number,
  ){
    return this.movieService.toggleMovieLike(movieId, userId, false);
  } 
}

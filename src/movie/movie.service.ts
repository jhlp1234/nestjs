import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Like, QueryRunner, Repository } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CommonService } from 'src/common/common.service';
import { join } from 'path';
import { rename } from 'fs/promises';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class MovieService {

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private readonly movieDetailRepository: Repository<MovieDetail>,
    @InjectRepository(Director)
    private readonly directorRepository: Repository<Director>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MovieUserLike)
    private readonly movieUserLikeRepository: Repository<MovieUserLike>,
    private readonly dataSource: DataSource,
    private readonly commonService: CommonService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findRecent(){
    const cacheData = await this.cacheManager.get('MOVIE_RECENT');
    if(cacheData){
      console.log('Cache');
      return cacheData;
    }

    const data = await this.movieRepository.find({order: {createdAt: 'DESC'}, take: 10});
  
    await this.cacheManager.set('MOVIE_RECENT', data);

    return data;
  }

  /* istanbul ignore next */
  async allMovies(){
    return this.movieRepository.createQueryBuilder('movie')
    .leftJoinAndSelect('movie.director', 'director')
    .leftJoinAndSelect('movie.genres', 'genres')
    .leftJoinAndSelect('movie.creator', 'creator')
  }
  
  /* istanbul ignore next */
  async getLikedMovies(movieIds: number[], userId: number){
    return this.movieUserLikeRepository.createQueryBuilder('mul')
      .leftJoinAndSelect('mul.user', 'user')
      .leftJoinAndSelect('mul.movie', 'movie')
      .where('movie.id IN (:...movieIds)', {movieIds})
      .andWhere('user.id = :userId', {userId})
      .getMany();
  }

  async getMovies(dto: GetMoviesDto, userId?: number) {
    const {title} = dto;

    const qb = await this.allMovies();

    if(title) qb.where('movie.title LIKE :title', {title: `%${title}%`});

    //this.commonService.applyPagePaginationParamsToQb(qb, dto);
    const {nextCursor} = await this.commonService.applyCursorPaginationParamsToQb(qb, dto);

    let [data, count] = await qb.getManyAndCount();

    if(userId){
      const movieIds = data.map((movie) => movie.id);

      const likedMovies = movieIds.length < 1 ? [] : await this.getLikedMovies(movieIds, userId);

      const likedMovieMap = likedMovies.reduce((acc, next) => ({
        ...acc,
        [next.movie.id]: next.isLike,
      }), {})

      data = data.map((x) => ({
        ...x,
        likeStatus: x.id in likedMovieMap ? likedMovieMap[x.id] : null
      }))
    }

    return {data, nextCursor, count};

  //   if(!title) return this.movieRepository.find({relations: ['director', 'genres']});
    
  //   return this.movieRepository.findAndCount({where: {title: Like(`%${title}%`)}, relations: ['director', 'genres']});
   }

   /* istanbul ignore next */
   async findMovieDetail(id){
    return this.movieRepository.createQueryBuilder('movie')
    .leftJoinAndSelect('movie.director', 'director')
    .leftJoinAndSelect('movie.genres', 'genres')
    .leftJoinAndSelect('movie.detail', 'detail')
    .leftJoinAndSelect('movie.creator', 'creator')
    .where('movie.id = :id', {id})
    .getOne();
   }

  async getMovie(id: number) {
    const movie = await this.findMovieDetail(id);

    // const movie = await this.movieRepository.findOne({where: {id}, relations: ['detail', 'director', 'genres']});
    
    if(!movie) throw new NotFoundException('존재하지않는 영화');

    return movie;
  }

  /* istanbul ignore next */
  async createMovieDetail(qr: QueryRunner, body: CreateMovieDto){
    return qr.manager.createQueryBuilder()
    .insert()
    .into(MovieDetail)
    .values({
      detail: body.detail
    })
    .execute();
  }

  /* istanbul ignore next */
  async createMovie(qr: QueryRunner, body: CreateMovieDto, movieDetailId: number, director: Director, userId: number, movieFolder: string){
    return qr.manager.createQueryBuilder()
    .insert()
    .into(Movie)
    .values({
      title: body.title,
      detail: {id: movieDetailId},
      director,
      creator: {id: userId},
      movieFilePath: join(movieFolder, body.movieFileName),
    })
    .execute();
  }

  /* istanbul ignore next */
  async createMovieGenreRelation(qr: QueryRunner, movieId: number, genres: Genre[]){
    return qr.manager.createQueryBuilder()
    .relation(Movie, 'genres')
    .of(movieId)
    .add(genres.map(genre => genre.id))
  }

  /* istanbul ignore next */
  async renameMovieFile(tempFolder: string, movieFolder: string, body: CreateMovieDto){
    return rename(
      join(process.cwd(), tempFolder, body.movieFileName),
      join(process.cwd(), movieFolder, body.movieFileName),
    )
  }

  async postMovie(body: CreateMovieDto, qr: QueryRunner, userId: number) {
    //   const director = await this.directorRepository.createQueryBuilder('director')
    // .where('director.id = :id', {id: body.directorId})
    // .getOne();
    const director = await qr.manager.findOne(Director, {where: {id: body.directorId}});

    if(!director) throw new NotFoundException('존재하지않는 감독');

    const genres = await qr.manager.find(Genre, {where: {id: In(body.genreIds)}});

    if(genres.length !== body.genreIds.length) throw new NotFoundException('잘못된 장르');

    // const existMovie = await qr.manager.findOne(Movie, {where: {title: body.title}});
    // if(existMovie) throw new BadRequestException("존재하는 영화");

    //const movie = await this.movieRepository.save({ title: body.title, detail: {detail: body.detail}, director, genres });

    const movieDetail = await this.createMovieDetail(qr, body);

    const movieDetailId = movieDetail.identifiers[0].id;

    const movieFolder = join('public', 'movie');
    const tempFolder = join('public', 'temp');

    await this.renameMovieFile(tempFolder, movieFolder, body);

    const movie = await this.createMovie(qr, body, movieDetailId, director, userId, movieFolder);

    const movieId = movie.identifiers[0].id;

    await this.createMovieGenreRelation(qr, movieId, genres);
      
    return await qr.manager.findOne(Movie, {where: {id: movieId}, relations: ['detail', 'director', 'genres']});
  }

  /* istanbul ignore next */
  async updateMovie(qr: QueryRunner, movieUpdateField: UpdateMovieDto, id: number){
    return qr.manager.createQueryBuilder()
    .update(Movie)
    .set(movieUpdateField)
    .where('id = :id', {id})
    .execute();
  }

  /* istanbul ignore next */
  async updateMovieDetail(body: UpdateMovieDto, movie: Movie){
    return this.movieDetailRepository.createQueryBuilder()
    .update(MovieDetail)
    .set({detail: body.detail})
    .where('id = :id', {id: movie.detail.id})
    .execute();
  }

  /* istanbul ignore next */
  async updateMovieGenreRelation(qr: QueryRunner, id: number, newGenres: Genre[], movie: Movie){
    return qr.manager.createQueryBuilder()
      .relation(Movie, 'genres')
      .of(id)
      .addAndRemove(newGenres.map(genre => genre.id), movie.genres.map(genre => genre.id));
  }

  async patchMovie(id: number, body: UpdateMovieDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const movie = await qr.manager.findOne(Movie, { where: { id }, relations: ['detail', 'genres'] });
    
      if(!movie) throw new NotFoundException('존재하지않는 영화');

      const {detail, directorId, genreIds, ...movieRest} = body;

      let newDirector;

      if(directorId) {
        const director = await qr.manager.findOne(Director, {where: {id: directorId}});

        if(!director) throw new NotFoundException('존재하지않는 감독');

        newDirector = director;
      }

      let newGenres;

      if(genreIds) {
        const genres = await qr.manager.find(Genre, {where: {id: In(genreIds)}});

        if(genres.length !== genreIds.length) throw new NotFoundException('잘못된 장르');

        newGenres = genres;
      }

      const movieUpdateField = {
        ...movieRest,
        ...(newDirector && {director: newDirector})
      }

      //await this.movieRepository.update({ id }, movieUpdateField);

      await this.updateMovie(qr, movieUpdateField, id);

      if(body.detail) await this.updateMovieDetail(body, movie);
      
      //await this.movieDetailRepository.update({id: movie.detail.id}, {detail: body.detail});

      if(newGenres) await this.updateMovieGenreRelation(qr, id, newGenres, movie);

      // const newMovie = await this.movieRepository.findOne({ where: { id }, relations: ['detail', 'director'] });

      // if(!newMovie) throw new NotFoundException('???');
      
      // newMovie.genres = newGenres;

      // await this.movieRepository.save(newMovie);

      await qr.commitTransaction();

      return this.movieRepository.findOne({ where: { id }, relations: ['detail', 'director', 'genres'] });

    } catch (error) {
      await qr.rollbackTransaction();

      throw error;
    } finally {
      await qr.release();
    }
  }

  /* istanbul ignore next */
  async removeMovie(id: number){
    return this.movieRepository.createQueryBuilder()
    .delete()
    .where('id = :id', {id})
    .execute();
  }

  async deleteMovie(id: number) {
    const movie = await this.movieRepository.findOne({where: {id}, relations: ['detail']});

    if(!movie) throw new NotFoundException('존재하지않는 영화');

    await this.removeMovie(id);

    //await this.movieRepository.delete(id);
    await this.movieDetailRepository.delete(movie.detail.id);
    console.log(id)

    return id;
  }

  /* istanbul ignore next */
  async getLikedRecord(movieId: number, userId: number){
    return this.movieUserLikeRepository.createQueryBuilder('mul')
    .leftJoinAndSelect('mul.movie', 'movie')
    .leftJoinAndSelect('mul.user', 'user')
    .where('movie.id = :movieId', {movieId})
    .andWhere('user.id = :userId', {userId})
    .getOne();
  }

  async toggleMovieLike(movieId: number, userId: number, isLike: boolean){
    const movie = await this.movieRepository.findOne({where: {id: movieId}});
    if(!movie) throw new BadRequestException('없는 영화');

    const user = await this.userRepository.findOne({where: {id: userId}});
    if(!user) throw new UnauthorizedException('없는 유저');

    const likeRecord = await this.getLikedRecord(movieId, userId);
    if(likeRecord){
      if(isLike === likeRecord.isLike){
        await this.movieUserLikeRepository.delete({movie, user});
      } else{
        await this.movieUserLikeRepository.update({movie, user}, {isLike});
      }
    } else{
      await this.movieUserLikeRepository.save({
        movie,
        user,
        isLike
      })
    }

    const result = await this.getLikedRecord(movieId, userId);

    return {isLike: result && result.isLike};
  }
}

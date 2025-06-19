import { Test, TestingModule } from '@nestjs/testing';
import { MovieService } from './movie.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Movie } from './entity/movie.entity';
import { MovieDetail } from './entity/movie-detail.entity';
import { CommonService } from 'src/common/common.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import {TestBed} from '@automock/jest';
import { Cache } from 'cache-manager';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

describe('MovieService', () => {
  let service: MovieService;
  let cacheManager: Cache;
  let movieRepository: jest.Mocked<Repository<Movie>>;
  let movieDetailRepository: jest.Mocked<Repository<MovieDetail>>;
  let directorRepository: jest.Mocked<Repository<Director>>;
  let genreRepository: jest.Mocked<Repository<Genre>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let movieUserLikeRepository: jest.Mocked<Repository<MovieUserLike>>;
  let dataSource: jest.Mocked<DataSource>;
  let commonService: jest.Mocked<CommonService>;

  beforeEach(async () => {
    const {unit, unitRef} = TestBed.create(MovieService).compile();

    service = unit;
    cacheManager = unitRef.get(CACHE_MANAGER);
    movieRepository = unitRef.get(getRepositoryToken(Movie) as string);
    movieDetailRepository = unitRef.get(getRepositoryToken(MovieDetail) as string);
    directorRepository = unitRef.get(getRepositoryToken(Director) as string);
    genreRepository = unitRef.get(getRepositoryToken(Genre) as string);
    userRepository = unitRef.get(getRepositoryToken(User) as string);
    movieUserLikeRepository = unitRef.get(getRepositoryToken(MovieUserLike) as string);
    dataSource = unitRef.get(DataSource);
    commonService = unitRef.get(CommonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterAll(() => {
    jest.clearAllMocks();
  })

  describe('findRecent', () => {
    it('should find recent movies', async () => {
      const recentMovies = [{id: 1, title: 'test'}];

      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(movieRepository, 'find').mockResolvedValue(recentMovies as Movie[]);

      const result = await service.findRecent();

      expect(cacheManager.get).toHaveBeenCalledWith('MOVIE_RECENT');
      expect(cacheManager.set).toHaveBeenCalledWith('MOVIE_RECENT', recentMovies);
      expect(result).toEqual(recentMovies);
    })

    it('should return cached data', async () => {
      const cacheData = [{id: 1, title: 'test'}];
      
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cacheData);

      const result = await service.findRecent();

      expect(cacheManager.get).toHaveBeenCalledWith('MOVIE_RECENT');
      expect(result).toEqual(cacheData);
    })
  })

  describe('getMovies', () => {
    let allMoviesMock: jest.SpyInstance;
    let getLikedMoviesMock: jest.SpyInstance;

    beforeEach(() => {
      allMoviesMock = jest.spyOn(service, 'allMovies');
      getLikedMoviesMock = jest.spyOn(service, 'getLikedMovies');
    })

    it('should get all movies', async () => {
      const movies = [{id: 1, title: 'test'}];
      const dto = {title: 'Movie'} as GetMoviesDto;
      const qb = {
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([movies, 1]),
      }

      allMoviesMock.mockResolvedValue(qb);
      jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockResolvedValue({nextCursor: 'test'} as any);

      const result = await service.getMovies(dto);

      expect(allMoviesMock).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('movie.title LIKE :title', {title: `%Movie%`});
      expect(commonService.applyCursorPaginationParamsToQb).toHaveBeenCalledWith(qb, dto);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(result).toEqual({data: movies, nextCursor: 'test', count: 1});
    })

    it('should return movies with user likes', async () => {
      const movies = [{id: 1, title: 'test'}];
      const likedMovies = [{movie: {id: 1}, isLike: true}];
      const userId = 1;
      const dto = {title: 'Movie'} as GetMoviesDto;
      const qb = {
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([movies, 1]),
      }

      allMoviesMock.mockResolvedValue(qb);
      jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockReturnValue({nextCursor: null} as any);
      getLikedMoviesMock.mockResolvedValue(likedMovies);

      const result = await service.getMovies(dto, userId);

      expect(allMoviesMock).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('movie.title LIKE :title', {title: `%Movie%`});
      expect(commonService.applyCursorPaginationParamsToQb).toHaveBeenCalledWith(qb, dto);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(getLikedMoviesMock).toHaveBeenCalledWith(movies.map(movie => movie.id), userId);
      expect(result).toEqual({data: [{id: 1, title: 'test', likeStatus: true}], nextCursor: null, count: 1});
    })

    it('should return no movies when find movies', async () => {
      const userId = 1;
      const dto = {title: 'Movie'} as GetMoviesDto;
      const qb = {
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 1]),
      }

      allMoviesMock.mockResolvedValue(qb);
      jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockReturnValue({nextCursor: null} as any);

      const result = await service.getMovies(dto, userId);

      expect(allMoviesMock).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('movie.title LIKE :title', {title: `%Movie%`});
      expect(commonService.applyCursorPaginationParamsToQb).toHaveBeenCalledWith(qb, dto);
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(result).toEqual({data: [], nextCursor: null, count: 1});
    })

    it('should return likeStatus null', async () => {
      const movies = [{id: 1, title: 'test'}];
      const likedMovies = [{movie: {id: 2}, isLike: true}];
      const userId = 1;
      const dto = {title: 'Movie'} as GetMoviesDto;
      const qb = {
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([movies, 1]),
      }

      allMoviesMock.mockResolvedValue(qb);
      jest.spyOn(commonService, 'applyCursorPaginationParamsToQb').mockReturnValue({nextCursor: null} as any);
      getLikedMoviesMock.mockResolvedValue(likedMovies);

      const result = await service.getMovies(dto, userId);

      expect(result).toEqual({data: [{id: 1, title: 'test', likeStatus: null}], nextCursor: null, count: 1});
    })
  })

  describe('getMovie', () => {
    let findMovieDetailMock: jest.SpyInstance;

    beforeEach(() => {
      findMovieDetailMock = jest.spyOn(service, 'findMovieDetail');
    })

    it('shoud get movie', async () => {
      const id = 1;
      const movie = {id: 1, title: 'test'};

      findMovieDetailMock.mockResolvedValue(movie);

      const result = await service.getMovie(id);

      expect(findMovieDetailMock).toHaveBeenCalledWith(id);
      expect(result).toEqual(movie);
    })

    it('should throw NotFoundException', async () => {
      findMovieDetailMock.mockResolvedValue(null);

      expect(service.getMovie(1)).rejects.toThrow(NotFoundException);
      expect(findMovieDetailMock).toHaveBeenCalledWith(1);
    })
  })

  describe('postMovie', () => {
    let qr: jest.Mocked<QueryRunner>;
    let createMovieDetailMock: jest.SpyInstance;
    let createMovieMock: jest.SpyInstance;
    let createMovieGenreRelationMock: jest.SpyInstance;
    let renameMovieFileMock: jest.SpyInstance;

    beforeEach(() => {
      qr = {
        manager: {
          findOne: jest.fn(),
          find: jest.fn(),
        }
      } as unknown as jest.Mocked<QueryRunner>;
      createMovieDetailMock = jest.spyOn(service, 'createMovieDetail');
      createMovieMock = jest.spyOn(service, 'createMovie');
      createMovieGenreRelationMock = jest.spyOn(service, 'createMovieGenreRelation');
      renameMovieFileMock = jest.spyOn(service, 'renameMovieFile');
    })

    it('should create a movie', async () => {
      const createMovieDto: CreateMovieDto = {title: 'Movie', directorId: 1, genreIds: [1, 2], detail: 'Detail', movieFileName: 'movie.mp4'};
      const userId = 1;
      const director = {id: 1, name: 'test'};
      const genres = [{id: 1, name: 'Genre1'}, {id: 2, name: 'Genre2'}];
      const movieDetailInsertResult = {identifiers: [{id: 1}]};
      const movieInsertResult = {identifiers: [{id: 1}]};

      (qr.manager.findOne as any).mockResolvedValueOnce(director);
      (qr.manager.findOne as any).mockResolvedValueOnce({...createMovieDto, id: 1});
      (qr.manager.find as any).mockResolvedValueOnce(genres);

      createMovieDetailMock.mockResolvedValue(movieDetailInsertResult);
      createMovieMock.mockResolvedValue(movieInsertResult);
      createMovieGenreRelationMock.mockResolvedValue(undefined);
      renameMovieFileMock.mockResolvedValue(undefined);

      const result = await service.postMovie(createMovieDto, qr, userId);

      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {where: {id: createMovieDto.directorId}});
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, {where: {id: In(createMovieDto.genreIds)}});
      expect(createMovieDetailMock).toHaveBeenCalledWith(qr, createMovieDto);
      expect(createMovieMock).toHaveBeenCalledWith(qr, createMovieDto, movieDetailInsertResult.identifiers[0].id, director, userId, expect.any(String));
      expect(createMovieGenreRelationMock).toHaveBeenCalledWith(qr, movieInsertResult.identifiers[0].id, genres);
      expect(renameMovieFileMock).toHaveBeenCalledWith(expect.any(String), expect.any(String), createMovieDto);
      expect(result).toEqual({...createMovieDto, id: 1});
    })

    it('should throw NotFoundException if director does not exist', async () => {
      const createMovieDto: CreateMovieDto = {title: 'Movie', directorId: 1, genreIds: [1, 2], detail: 'Detail', movieFileName: 'movie.mp4'};
      const userId = 1;

      (qr.manager.findOne as any).mockResolvedValue(null);

      await expect(service.postMovie(createMovieDto, qr, userId)).rejects.toThrow(NotFoundException);
      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {where: {id: createMovieDto.directorId}});
    })
    
    it('should throw NotFoundException if genres do not exist', async () => {
      const createMovieDto: CreateMovieDto = {title: 'Movie', directorId: 1, genreIds: [1, 2], detail: 'Detail', movieFileName: 'movie.mp4'};
      const userId = 1;
      const director = {id: 1, name: 'test'};

      (qr.manager.findOne as any).mockResolvedValueOnce(director);
      (qr.manager.find as any).mockResolvedValueOnce([{id: 1, name: 'Genre1'}]);

      await expect(service.postMovie(createMovieDto, qr, userId)).rejects.toThrow(NotFoundException);
      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {where: {id: createMovieDto.directorId}});
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, {where: {id: In(createMovieDto.genreIds)}});
    })
  })

  describe('patchMovie', () => {
    let qr: jest.Mocked<QueryRunner>;
    let updateMovieMock: jest.SpyInstance;
    let updateMovieDetailMock: jest.SpyInstance;
    let updateMovieGenreRelationMock: jest.SpyInstance;

    beforeEach(() => {
      qr = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          find: jest.fn(),
          findOne: jest.fn(),
        }
      } as unknown as jest.Mocked<QueryRunner>;

      updateMovieMock = jest.spyOn(service, 'updateMovie');
      updateMovieDetailMock = jest.spyOn(service, 'updateMovieDetail');
      updateMovieGenreRelationMock = jest.spyOn(service, 'updateMovieGenreRelation');

      jest.spyOn(dataSource, 'createQueryRunner').mockReturnValue(qr);
    })

    it('should update a movie', async () => {
      const id = 1;
      const body: UpdateMovieDto = {title: 'movie', directorId: 1, genreIds: [1, 2], detail: 'updated detail'}; 
      const movie = {id: 1, detail: {id: 1}, genres: [{id: 1}, {id: 2}]};
      const director = {id: 1, name: 'director'};
      const genres = [{id: 1, name: 'Genre1'}, {id: 2, name: 'Genre2'}];

      (qr.connect as any).mockResolvedValue(null);
      (qr.manager.findOne as any).mockResolvedValueOnce(movie);
      (qr.manager.findOne as any).mockResolvedValueOnce(director);
      jest.spyOn(movieRepository, 'findOne').mockResolvedValue(movie as Movie);
      (qr.manager.find as any).mockResolvedValueOnce(genres);

      updateMovieMock.mockResolvedValue(undefined);
      updateMovieDetailMock.mockResolvedValue(undefined);
      updateMovieGenreRelationMock.mockResolvedValue(undefined);

      const result = await service.patchMovie(id, body);

      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {where: {id: 1}, relations: ['detail', 'genres']});
      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {where: {id: body.directorId}});
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, {where: {id: In(body.genreIds as number[])}});
      expect(updateMovieMock).toHaveBeenCalledWith(qr, expect.any(Object), id);
      expect(updateMovieDetailMock).toHaveBeenCalledWith(body, movie);
      expect(updateMovieGenreRelationMock).toHaveBeenCalledWith(qr, id, genres, movie);
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual(movie);
    })

    it('should throw NotFoundException if movie does not exist', async () => {
      const body: UpdateMovieDto = {title: 'Updated Movie'};

      (qr.manager.findOne as any).mockResolvedValue(null);

      await expect(service.patchMovie(1, body)).rejects.toThrow(NotFoundException);
      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {where: {id: 1}, relations: ['detail', 'genres']});
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    })

    it('should throw NotFoundException if director does not exist', async () => {
      const body: UpdateMovieDto = {title: 'Updated Movie', directorId: 1};
      const movie = {id: 1, detail: {id: 1}, genres: []};

      (qr.manager.findOne as any).mockResolvedValueOnce(movie);
      (qr.manager.findOne as any).mockResolvedValueOnce(null);

      await expect(service.patchMovie(1, body)).rejects.toThrow(NotFoundException);
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {where: {id: 1}, relations: ['detail', 'genres']});
      expect(qr.manager.findOne).toHaveBeenCalledWith(Director, {where: {id: body.directorId}});
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    })

    it('should throw NotFoundException if new genres does not exist', async () => {
      const body: UpdateMovieDto = {title: 'Updated Movie', genreIds: [1, 2]};
      const movie = {id: 1, detail: {id: 1}, genres: []};
      
      (qr.manager.findOne as any).mockResolvedValueOnce(movie);
      (qr.manager.find as any).mockResolvedValueOnce([]);

      await expect(service.patchMovie(1, body)).rejects.toThrow(NotFoundException);
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {where: {id: 1}, relations: ['detail', 'genres']});
      expect(qr.manager.find).toHaveBeenCalledWith(Genre, {where: {id: In(body.genreIds as number[])}});
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    })

    it('should rollback transaction and rethrow error', async () => {
      const body: UpdateMovieDto = {title: 'Updated Movie'};

      (qr.manager.findOne as any).mockRejectedValueOnce(new Error('Database Error'));

      await expect(service.patchMovie(1, body)).rejects.toThrow('Database Error');
      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.manager.findOne).toHaveBeenCalledWith(Movie, {where: {id: 1}, relations: ['detail', 'genres']});
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    })
  })

  describe('deleteMovie', () => {
    let findOneMock: jest.SpyInstance;
    let removeMovieMock: jest.SpyInstance;
    let deleteMovieDetailMock: jest.SpyInstance;

    beforeEach(() => {
      findOneMock = jest.spyOn(movieRepository, 'findOne');
      removeMovieMock = jest.spyOn(service, 'removeMovie');
      deleteMovieDetailMock = jest.spyOn(movieDetailRepository, 'delete');
    })

    it('should remove a movie successfully', async () => {
      const movie = {id: 1, detail: {id: 2}};

      findOneMock.mockResolvedValue(movie);
      removeMovieMock.mockResolvedValue(undefined);
      deleteMovieDetailMock.mockResolvedValue(undefined);

      const result = await service.deleteMovie(1);

      expect(findOneMock).toHaveBeenCalledWith({where: {id: 1}, relations: ['detail']});
      expect(removeMovieMock).toHaveBeenCalledWith(1);
      expect(deleteMovieDetailMock).toHaveBeenCalledWith(movie.detail.id);
      expect(result).toBe(1);
    })

    it('should throw NotFoundException if movie does not exist', async () => {
      findOneMock.mockResolvedValue(null);

      await expect(service.deleteMovie(1)).rejects.toThrow(NotFoundException);
      expect(findOneMock).toHaveBeenCalledWith({where: {id: 1}, relations: ['detail']});
      expect(removeMovieMock).not.toHaveBeenCalled();
      expect(deleteMovieDetailMock).not.toHaveBeenCalled();
    })
  })

  describe('toggleMovieLike', () => {
    let findOneMovieMock: jest.SpyInstance;
    let findOneUserMock: jest.SpyInstance;
    let getLikedRecordMock: jest.SpyInstance;
    let deleteLikeMock: jest.SpyInstance;
    let updateLikeMock: jest.SpyInstance;
    let saveLikeMock: jest.SpyInstance;

    beforeEach(() => {
      findOneMovieMock = jest.spyOn(movieRepository, 'findOne');
      findOneUserMock = jest.spyOn(userRepository, 'findOne');
      getLikedRecordMock = jest.spyOn(service, 'getLikedRecord');
      deleteLikeMock = jest.spyOn(movieUserLikeRepository, 'delete');
      updateLikeMock = jest.spyOn(movieUserLikeRepository, 'update');
      saveLikeMock = jest.spyOn(movieUserLikeRepository, 'save');
    })

    it('should toggle movie like status successfully', async () => {
      const movie = {id: 1};
      const user = {id: 1};
      const likeRecord = {movie, user, isLike: true};

      findOneMovieMock.mockResolvedValue(movie);
      findOneUserMock.mockResolvedValue(user);
      getLikedRecordMock.mockResolvedValueOnce(likeRecord).mockResolvedValue({isLike: false});

      const result = await service.toggleMovieLike(1, 1, false);

      expect(findOneMovieMock).toHaveBeenCalledWith({where: {id: 1}});
      expect(findOneUserMock).toHaveBeenCalledWith({where: {id: 1}});
      expect(getLikedRecordMock).toHaveBeenCalledWith(1, 1);
      expect(updateLikeMock).toHaveBeenCalledWith({movie, user}, {isLike: false});
      expect(result).toEqual({isLike: false});
    })

    it('should delete like record', async () => {
      const movie = {id: 1};
      const user = {id: 1};
      const likeRecord = {movie, user, isLike: true};

      findOneMovieMock.mockResolvedValue(movie);
      findOneUserMock.mockResolvedValue(user);
      getLikedRecordMock.mockResolvedValueOnce(likeRecord).mockResolvedValueOnce(null);

      const result = await service.toggleMovieLike(1, 1, true);

      expect(findOneMovieMock).toHaveBeenCalledWith({where: {id: 1}});
      expect(findOneUserMock).toHaveBeenCalledWith({where: {id: 1}});
      expect(getLikedRecordMock).toHaveBeenCalledWith(1, 1);
      expect(deleteLikeMock).toHaveBeenCalledWith({movie, user});
      expect(result).toEqual({isLike: null});
    })

    it('should save a new like record', async () => {
      const movie = {id: 1};
      const user = {id: 1};

      findOneMovieMock.mockResolvedValue(movie);
      findOneUserMock.mockResolvedValue(user);
      getLikedRecordMock.mockResolvedValueOnce(null).mockResolvedValueOnce({isLike: true});

      const result = await service.toggleMovieLike(1, 1, true);

      expect(findOneMovieMock).toHaveBeenCalledWith({where: {id: 1}});
      expect(findOneUserMock).toHaveBeenCalledWith({where: {id: 1}});
      expect(getLikedRecordMock).toHaveBeenCalledWith(1, 1);
      expect(saveLikeMock).toHaveBeenCalledWith({movie, user, isLike: true});
      expect(result).toEqual({isLike: true});
    })

    it('should throw BadRequestException if movie does not exist', async () => {
      findOneMovieMock.mockResolvedValue(null);

      await expect(service.toggleMovieLike(1, 1, true)).rejects.toThrow(BadRequestException);
      expect(findOneMovieMock).toHaveBeenCalledWith({where: {id: 1}});
      expect(findOneUserMock).not.toHaveBeenCalled();
    })

    it('should throw UnauthorizedException if user does not exist', async () => {
      const movie = {id: 1};

      findOneMovieMock.mockResolvedValue(movie);
      findOneUserMock.mockResolvedValue(null);

      await expect(service.toggleMovieLike(1, 1, true)).rejects.toThrow(UnauthorizedException);
      expect(findOneMovieMock).toHaveBeenCalledWith({where: {id: 1}});
      expect(findOneUserMock).toHaveBeenCalledWith({where: {id: 1}});
    })
  })
});
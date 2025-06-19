import { Test, TestingModule } from '@nestjs/testing';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';
import { TestBed } from '@automock/jest';
import { Movie } from './entity/movie.entity';
import { CreateMovieDto } from './dto/create-movie.dto';
import { QueryRunner } from 'typeorm';
import { UpdateMovieDto } from './dto/update-movie.dto';

describe('MovieController', () => {
  let controller: MovieController;
  let service: MovieService;

  beforeEach(async () => {
    const {unit, unitRef} = TestBed.create(MovieController).compile();

    controller = unit;
    service = unitRef.get<MovieService>(MovieService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMovies', () => {
    it('should call service.getMovies', async () => {
      const dto = {pager: 1, limit: 10};
      const userId = 1;
      const movies = [{id: 1, title: 'test'}];

      jest.spyOn(service, 'getMovies').mockResolvedValue(movies as any);

      const result = await controller.getMovies(dto as any, userId);

      await expect(result).toEqual(movies);
      expect(service.getMovies).toHaveBeenCalledWith(dto, userId);
    })
  })

  describe('getMoviesRecent', () => {
    it('should call service.findRecent', async () => {
      const dto = {pager: 1, limit: 10};
      const userId = 1;
      const movies = [{id: 1, title: 'test'}];

      await controller.getMoviesRecent();

      expect(service.findRecent).toHaveBeenCalled();
    })
  })

  describe('findOne', () => {
    it('should call service.getMovie', async () => {
      const id = 1;

      await controller.getMovie(id);

      expect(service.getMovie).toHaveBeenCalledWith(id);
    })
  })

  describe('postMovie', () => {
    it('should call service.postMovie', async () => {
      const body = {title: 'test'};
      const userId = 1;
      const queryRunner = {};

      await controller.postMovie(body as CreateMovieDto, queryRunner as QueryRunner, userId);

      expect(service.postMovie).toHaveBeenCalledWith(body, queryRunner, userId);
    })
  })

  describe('patchMovie', () => {
    it('should call service.patchMovie', async () => {
      const id = 1;
      const body: UpdateMovieDto = {title: 'test'};

      await controller.patchMovie(id, body);

      expect(service.patchMovie).toHaveBeenCalledWith(id, body);
    })
  })

  describe('deleteMovie', () => {
    it('should call service.deleteMovie', async () => {
      const id = 1;

      await controller.deleteMovie(id);

      expect(service.deleteMovie).toHaveBeenCalledWith(id);
    })
  })

  describe('createMovieLike', () => {
    it('should call service.toggleMovieLike with the correct parameters', async () => {
      const movieId = 1;
      const userId = 2;

      await controller.createMovieLike(movieId, userId);

      expect(service.toggleMovieLike).toHaveBeenCalledWith(movieId, userId, true);
    })
  })

  describe('createMovieDisLike', () => {
    it('should call service.toggleMovieDisLike with the correct parameters', async () => {
      const movieId = 1;
      const userId = 2;

      await controller.createMovieDislike(movieId, userId);

      expect(service.toggleMovieLike).toHaveBeenCalledWith(movieId, userId, false);
    })
  })
});

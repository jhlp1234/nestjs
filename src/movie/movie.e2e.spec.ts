import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Role, User } from 'src/user/entities/user.entity';
import { Director } from 'src/director/entity/director.entity';
import { Movie } from './entity/movie.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { DataSource } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { resolve } from 'path';
import { AuthService } from 'src/auth/auth.service';
import { bool } from 'joi';

describe('MovieController (e2e)', () => {
  let app: INestApplication<App>;

  let users: User[];
  let directors: Director[];
  let movies: Movie[];
  let genres: Genre[];
  let dataSource: DataSource;

  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true
      },
    }));

    await app.init();
    
    dataSource = app.get<DataSource>(DataSource);

    const movieUserLikeRepository = dataSource.getRepository(MovieUserLike);
    const movieRepository = dataSource.getRepository(Movie);
    const movieDetailRepository = dataSource.getRepository(MovieDetail);
    const userRepository = dataSource.getRepository(User);
    const directorRepository = dataSource.getRepository(Director);
    const genreRepository = dataSource.getRepository(Genre);

    await movieUserLikeRepository.delete({});
    await movieRepository.delete({});
    await genreRepository.delete({});
    await directorRepository.delete({});
    await userRepository.delete({});
    await movieDetailRepository.delete({});

    users = [1, 2].map((x) => userRepository.create({id: x, email: `${x}@gmail.com`, password: '1234'}));
    await userRepository.save(users);

    directors = [1, 2].map((x) => directorRepository.create({id: x, name: `Director ${x}`, dob: new Date('2000-01-01'), nationality: 'South Korea'}));
    await directorRepository.save(directors);

    genres = [1, 2].map((x) => genreRepository.create({id: x, name: `Genre ${x}`}));
    await genreRepository.save(genres);

    movies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((x) => movieRepository.create({
        id: x,
        title: `Movie ${x}`,
        creator: users[0],
        genres: genres,
        likeCount: 0,
        disLikeCount: 0,
        detail: movieDetailRepository.create({
            detail: `Movie Detail ${x}`,
        }),
        movieFilePath: 'movies/movie1.mp4',
        director: directors[0],
        createdAt: new Date(`2025-06-${x}`),
    }))
    await movieRepository.save(movies);

    let authService = moduleFixture.get<AuthService>(AuthService);
    token = await authService.issueToken({id: users[0].id, role: Role.admin,}, false);
  });

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await dataSource.destroy();
    await app.close();
  })

  describe('[GET /movie]', () => {
    it('should get all movies', async () => {
      const {body, statusCode} = await request(app.getHttpServer())
      .get('/movie')

      expect(statusCode).toBe(200);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('nextCursor');
      expect(body).toHaveProperty('count');
      expect(body.data).toHaveLength(5);
    })
  })

  describe('[GET /movie/recent]', () => {
    it('should get recent movies', async () => {
      const {body, statusCode} = await request(app.getHttpServer())
      .get('/movie/recent')
      .set('authorization', `Bearer ${token}`)

      expect(statusCode).toBe(200);
      expect(body).toHaveLength(10);
    })
  })

  describe('[GET /movie{id}]', () => {
    it('should get movie by id', async () => {
      const movieId = movies[0].id;

      const {body, statusCode} = await request(app.getHttpServer())
      .get(`/movie/${movieId}`)
      .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(200);
      expect(body.id).toBe(movieId);
    })

    it('should throw 404 error', async () => {
      const movieId = 10000;

      const {body, statusCode} = await request(app.getHttpServer())
      .get(`/movie/${movieId}`)
      .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(404);
    })
  })

  describe('[POST /movie]', () => {
    it('should create movie', async () => {
      const {body: {fileName}} = await request(app.getHttpServer())
      .post('/common/video')
      .set('authorization', `Bearer ${token}`)
      .attach('video', Buffer.from('test'), 'movie.mp4')
      .expect(201);

      const dto = {title: 'Test Movie', detail: 'Test Detail', directorId: directors[0].id, genreIds: genres.map((x) => x.id), movieFileName: fileName}

      const {body, statusCode} = await request(app.getHttpServer())
      .post('/movie')
      .set('authorization', `Bearer ${token}`)
      .send(dto);

      expect(statusCode).toBe(201);
      expect(body).toBeDefined();
      expect(body.title).toBe(dto.title);
      expect(body.detail.detail).toBe(dto.detail);
      expect(body.director.id).toBe(dto.directorId);
      expect(body.genres.map((x) => x.id)).toEqual(dto.genreIds);
      expect(body.movieFilePath).toContain(fileName);
    })
  })

  describe('[PATCH /movie/{id}]', () => {
    it('should update movie', async () => {
      const dto = {title: 'Updated Movie', detail: 'Updated Detail'};
      const movieId = movies[0].id;

      const {body, statusCode} = await request(app.getHttpServer())
      .patch(`/movie/${movieId}`)
      .set('authorization', `Bearer ${token}`)
      .send(dto);

      expect(statusCode).toBe(200);
      expect(body.title).toBe(dto.title);
      expect(body.detail.detail).toBe(dto.detail);
    })

    it('should throw 404 error in update', async () => {
      const dto = {title: 'Updated Movie'};
      const movieId = 10000;

      const {statusCode} = await request(app.getHttpServer())
      .patch(`/movie/${movieId}`)
      .set('authorization', `Bearer ${token}`)
      .send(dto);

      expect(statusCode).toBe(404);
    })
  })

  describe('[DELETE /movie/{id}]', () => {
    it('should delete movie', async () => {
      const movieId = movies[0].id;

      const {body ,statusCode} = await request(app.getHttpServer())
      .delete(`/movie/${movieId}`)
      .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(200);
      //expect(body).toBe(movieId);
    })

    it('should throw 404 error in delete', async () => {
      const movieId = 10000;

      const {statusCode} = await request(app.getHttpServer())
      .delete(`/movie/${movieId}`)
      .set('authorization', `Bearer ${token}`);
    })
  })

  describe('[POST /movie{id}/like]', () => {
    it('should like a movie', async () => {
      const movieId = movies[1].id;
      
      const {body, statusCode} = await request(app.getHttpServer())
      .post(`/movie/${movieId}/like`)
      .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(201);
      expect(body).toBeDefined();
      expect(body.isLike).toBe(true);
    })

    it('should cancel like a movie', async () => {
      const movieId = movies[1].id;
      
      const {body, statusCode} = await request(app.getHttpServer())
      .post(`/movie/${movieId}/like`)
      .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(201);
      expect(body).toBeDefined();
      expect(body.isLike).toBeNull();
    })
  })

  describe('[POST /movie{id}/dislike]', () => {
    it('should dislike a movie', async () => {
      const movieId = movies[1].id;
      
      const {body, statusCode} = await request(app.getHttpServer())
      .post(`/movie/${movieId}/dislike`)
      .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(201);
      expect(body).toBeDefined();
      expect(body.isLike).toBe(false);
    })

    it('should cancel dislike a movie', async () => {
      const movieId = movies[1].id;
      
      const {body, statusCode} = await request(app.getHttpServer())
      .post(`/movie/${movieId}/dislike`)
      .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(201);
      expect(body).toBeDefined();
      expect(body.isLike).toBeNull();
    })
  })
});

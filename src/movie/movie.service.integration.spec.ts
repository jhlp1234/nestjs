import { CACHE_MANAGER, CacheModule } from "@nestjs/cache-manager"
import { Test, TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Movie } from "./entity/movie.entity"
import { MovieDetail } from "./entity/movie-detail.entity"
import { Director } from "src/director/entity/director.entity"
import { Genre } from "src/genre/entities/genre.entity"
import { User } from "src/user/entities/user.entity"
import { MovieUserLike } from "./entity/movie-user-like.entity"
import { MovieService } from "./movie.service"
import { CommonService } from "src/common/common.service"
import { Cache } from "cache-manager"
import { DataSource } from "typeorm"
import { GetMoviesDto } from "./dto/get-movies.dto"
import { CreateMovieDto } from "./dto/create-movie.dto"
import { UpdateMovieDto } from "./dto/update-movie.dto"
import { NotFoundException } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

describe('MovieService - Integration Test', () => {
    let service: MovieService;
    let cacheManager: Cache;
    let dataSource: DataSource;

    let users: User[];
    let directors: Director[];
    let movies: Movie[];
    let genres: Genre[];

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                CacheModule.register(),
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    dropSchema: true,
                    entities: [Movie, MovieDetail, Director, Genre, User, MovieUserLike],
                    synchronize: true,
                    logging: false,
                }),
                TypeOrmModule.forFeature([
                    Movie,
                    MovieDetail,
                    Director,
                    Genre,
                    User,
                    MovieUserLike,
                ]),
                ConfigModule.forRoot(),
            ],
            providers: [MovieService, CommonService]
        }).compile();

        service = module.get<MovieService>(MovieService);
        cacheManager = module.get<Cache>(CACHE_MANAGER);
        dataSource = module.get<DataSource>(DataSource);
    })

    it('should be defined', () => {
        expect(service).toBeDefined();
    })

    beforeEach(async () => {
        await cacheManager.clear();

        const movieRepository = dataSource.getRepository(Movie);
        const movieDetailRepository = dataSource.getRepository(MovieDetail);
        const userRepository = dataSource.getRepository(User);
        const directorRepository = dataSource.getRepository(Director);
        const genreRepository = dataSource.getRepository(Genre);

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
    })

    afterAll(async () => {
        await dataSource.destroy();
    })

    describe('findRecent', () => {
        it('should return recent movies', async () => {
            const result = await service.findRecent() as Movie[];

            let sortedResult = [...movies];
            sortedResult.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            let sortedResultIds = sortedResult.slice(0, 10).map((x) => x.id);

            expect(result).toHaveLength(10);
            expect(result.map((x) => x.id)).toEqual(sortedResultIds);
        })

        it('should cache recent movies', async () => {
            const result = await service.findRecent() as Movie[];

            const cachedData = await cacheManager.get('MOVIE_RECENT');

            expect(cachedData).toEqual(result.map((x) => ({...x, createdAt: x.createdAt.toISOString(), updatedAt: x.updatedAt.toISOString()})));
        })
    })

    describe('getMovie', () => {
        it('should return movie', async () => {
            const movieId = movies[0].id;

            const result = await service.getMovie(movieId);

            expect(result.id).toBe(movieId);
        })

        it('should throw error if movie does not exist in getMovie', async () => {
            await expect(service.getMovie(100)).rejects.toThrow(NotFoundException);
        })
    })

    describe('getMovies', () => {
        it('should return movies with correct title', async () => {
            const dto = {title: 'Movie 15', order: ['createdAt_DESC'], take: 10};

            const result = await service.getMovies(dto);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].title).toBe(dto.title);
            expect(result.data[0]).not.toHaveProperty('likeStatus');
        })

        it('should return likeStatus if userId', async () => {
            const dto = {order: ['createdAt_DESC'], take: 10} as GetMoviesDto;

            const result = await service.getMovies(dto, users[0].id);

            expect(result.data).toHaveLength(10);
            expect(result.data[0]).toHaveProperty('likeStatus');
        })
    })

    describe('postMovie', () => {
        beforeEach(() => {
            jest.spyOn(service, 'renameMovieFile').mockResolvedValue();
        })

        it('should create movie', async () => {
            const createMovieDto: CreateMovieDto = {
                title: 'Test Movie',
                detail: 'Test Detail',
                directorId: directors[0].id,
                genreIds: genres.map((x) => x.id),
                movieFileName: 'test.mp4',
            }

            const result = await service.postMovie(createMovieDto, dataSource.createQueryRunner(), users[0].id) as Movie;
        
            expect(result.title).toBe(createMovieDto.title);
            expect(result.director.id).toBe(createMovieDto.directorId);
            expect(result.genres.map((x) => x.id)).toEqual(genres.map((x) => x.id));
            expect(result.detail.detail).toBe(createMovieDto.detail);
        })
    })

    describe('patchMovie', () => {
        it('should update movie', async () => {
            const movieId = movies[0].id;
            const updateMovieDto: UpdateMovieDto = {
                title: 'Changed Title',
                detail: 'Changed Detail',
                directorId: directors[1].id,
                genreIds: [genres[0].id],
            }

            const result = await service.patchMovie(movieId, updateMovieDto) as Movie;

            expect(result.title).toBe(updateMovieDto.title);
            expect(result.detail.detail).toBe(updateMovieDto.detail);
            expect(result.director.id).toBe(updateMovieDto.directorId);
            expect(result.genres.map((x) => x.id)).toEqual(updateMovieDto.genreIds);
        })

        it('should throw error if movie does not exist', async () => {
            const updateMovieDto: UpdateMovieDto = {
                title: 'Changed Title',
            }

            await expect(service.patchMovie(100, updateMovieDto)).rejects.toThrow(NotFoundException);
        })
    })

    describe('deleteMovie', () => {
        it('should delete movie', async () => {
            const removeId = movies[0].id;

            const result = await service.deleteMovie(removeId);

            expect(result).toBe(removeId);
        })

        it('should throw error if movie does not exist in deleteMovie', async () => {
            await expect(service.deleteMovie(100)).rejects.toThrow(NotFoundException);
        })
    })

    describe('toggleMovieLIke', () => {
        it('should create like', async () => {
            const userId = users[0].id;
            const movieId = movies[0].id;

            const result = await service.toggleMovieLike(movieId, userId, true);

            expect(result).toEqual({isLike: true});
        })

        it('should create dislike', async () => {
            const userId = users[0].id;
            const movieId = movies[0].id;

            const result = await service.toggleMovieLike(movieId, userId, false);

            expect(result).toEqual({isLike: false});
        })

        it('should toggle like', async () => {
            const userId = users[0].id;
            const movieId = movies[0].id;

            await service.toggleMovieLike(movieId, userId, true);
            const result = await service.toggleMovieLike(movieId, userId, true);

            expect(result.isLike).toBeFalsy();
        })

        it('should toggle dislike', async () => {
            const userId = users[0].id;
            const movieId = movies[0].id;

            await service.toggleMovieLike(movieId, userId, false);
            const result = await service.toggleMovieLike(movieId, userId, false);

            expect(result.isLike).toBeFalsy();
        })
    })
})
import { Test, TestingModule } from '@nestjs/testing';
import { GenreService } from './genre.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Genre } from './entities/genre.entity';
import { Repository } from 'typeorm';
import { CreateGenreDto } from './dto/create-genre.dto';
import { UpdateGenreDto } from './dto/update-genre.dto';
import { NotFoundException } from '@nestjs/common';

const mockGenreRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('GenreService', () => {
  let service: GenreService;
  let repository: Repository<Genre>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenreService,
        {
          provide: getRepositoryToken(Genre),
          useValue: mockGenreRepository,
        }
      ],
    }).compile();

    service = module.get<GenreService>(GenreService);
    repository = module.get<Repository<Genre>>(getRepositoryToken(Genre));
  });

  afterAll(() => {
    jest.clearAllMocks();
  })

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a genre', async () => {
      const genre: CreateGenreDto = {name: 'test'};

      jest.spyOn(mockGenreRepository, 'save').mockResolvedValue(genre);

      const result = await service.create(genre);

      expect(mockGenreRepository.save).toHaveBeenCalledWith(genre);
      expect(result).toEqual(genre);
    })
  })

  describe('findAll', () => {
    it('should find genres', async () => {
      const genres = [{id: 1, name: 'sad'}];

      jest.spyOn(mockGenreRepository, 'find').mockResolvedValue(genres);

      const result = await service.findAll();

      expect(result).toEqual(genres);
      expect(mockGenreRepository.find).toHaveBeenCalled();
    })
  })

  describe('findOne', () => {
    it('should find a genre', async () => {
      const genre = {id: 1, name: 'sad'};

      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(genre);

      const result = await service.findOne(1);

      expect(result).toEqual(genre);
      expect(mockGenreRepository.findOne).toHaveBeenCalledWith({where: {id: 1}});
    })
  })

  describe('update', () => {
    it('should update genre', async () => {
      const updateGenreDto: UpdateGenreDto = {name: 'funny'};
      const genre = {id: 1, name: 'sad'};
      const newGenre = {id: 1, name: 'funny'};

      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValueOnce(genre);
      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValueOnce(newGenre);

      const result = await service.update(1, updateGenreDto);

      expect(mockGenreRepository.findOne).toHaveBeenCalledWith({where: {id: 1}});
      expect(mockGenreRepository.update).toHaveBeenCalledWith({id: 1}, updateGenreDto);
      expect(result).toEqual(newGenre);
    })

    it('should throw NotFoundException', async () => {
      const updateGenreDto: UpdateGenreDto = {name: 'funny'};

      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, updateGenreDto)).rejects.toThrow(NotFoundException);
    })
  })

  describe('remove', () => {
    it('should remove a genre', async () => {
      const id = 1;
      const genre = {id: 1, name: 'sad'};

      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(genre);

      const result = await service.remove(id);

      expect(result).toBe(id);
      expect(mockGenreRepository.findOne).toHaveBeenCalledWith({where: {id}});
      expect(mockGenreRepository.delete).toHaveBeenCalledWith(id);
    })

    it('should throw error', async () => {
      const id = 1;

      jest.spyOn(mockGenreRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    })
  })
});

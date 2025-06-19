import { Test, TestingModule } from '@nestjs/testing';
import { DirectorService } from './director.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Director } from './entity/director.entity';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

const mockDirectorRepository = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}

describe('DirectorService', () => {
  let directorService: DirectorService;
  let directorRepository: Repository<Director>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectorService,
        {
          provide: getRepositoryToken(Director),
          useValue: mockDirectorRepository,
        }
      ],
    }).compile();

    directorService = module.get<DirectorService>(DirectorService);
    directorRepository = module.get<Repository<Director>>(getRepositoryToken(Director));
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('should be defined', () => {
    expect(directorService).toBeDefined();
  });
  
  describe('create', () => {
    it('should create a director', async () => {
      const createDirectorDto = {
        name: 'test',
        nationality: 'korea',
        dob: 'dob',
      };

      jest.spyOn(mockDirectorRepository, 'save').mockResolvedValue(createDirectorDto);

      const result = await directorService.create(createDirectorDto);

      expect(result).toEqual(createDirectorDto);
    })
  })

  describe('find', () => {
    it('should find users', async () => {
      const directors = [{id: 1, name: 'test'}];

      jest.spyOn(mockDirectorRepository, 'find').mockResolvedValue(directors);

      const result = await directorService.findAll();

      expect(mockDirectorRepository.find).toHaveBeenCalled();
      expect(result).toEqual(directors);
    })
  })

  describe('findOne', () => {
    it('should find a user', async () => {
      const id = 1;
      const director = {id: 1, name: 'test'};

      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValue(director);

      const result = await directorService.findOne(id);

      expect(mockDirectorRepository.findOne).toHaveBeenCalledWith({where: {id}});
      expect(result).toEqual(director);
    })
  })

  describe('update', () => {
    it('should update director', async () => {
      const director = {name: 'test'};
      const newDirector = {name: 'test2'};
      const updateDirectorDto: UpdateDirectorDto = {
        name: 'test2',
        dob: '???',
        nationality: 'earth',
      }

      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValueOnce(director);
      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValueOnce(newDirector);

      const result = await directorService.update(1, updateDirectorDto);

      expect(mockDirectorRepository.findOne).toHaveBeenCalledWith({where: {id: 1}});
      expect(mockDirectorRepository.update).toHaveBeenCalledWith({id: 1}, updateDirectorDto);
      expect(result).toEqual(newDirector);
    })

    it('should throw error if director is not exist', async () => {
      const id = 1;
      const updateDirectorDto: UpdateDirectorDto = {
        name: 'test',
        dob: 'no',
        nationality: 'korea',
      }

      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValue(null);

      expect(directorService.update(id, updateDirectorDto)).rejects.toThrow(NotFoundException);
    })
  })

  describe('remove', () => {
    it('should remove director', async () => {
      const director = {name: 'test'};

      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValue(director);

      const result = await directorService.remove(1);

      expect(mockDirectorRepository.findOne).toHaveBeenCalledWith({where: {id: 1}});
      expect(mockDirectorRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual(1);
    })

    it('should throw error if director is not exist', async () => {
      const id = 1;

      jest.spyOn(mockDirectorRepository, 'findOne').mockResolvedValue(null);

      expect(directorService.remove(id)).rejects.toThrow(NotFoundException);
    })
  })
});

import { Test, TestingModule } from '@nestjs/testing';
import { DirectorController } from './director.controller';
import { DirectorService } from './director.service';
import { CreateDirectorDto } from './dto/create-director.dto';
import { UpdateDirectorDto } from './dto/update-director.dto';

const mockDirectorService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}

describe('DirectorController', () => {
  let directorController: DirectorController;
  let directorService: DirectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DirectorController],
      providers: [
        {
          provide: DirectorService,
          useValue: mockDirectorService,
        }
      ],
    }).compile();

    directorController = module.get<DirectorController>(DirectorController);
    directorService = module.get<DirectorService>(DirectorService);
  });

  it('should be defined', () => {
    expect(directorController).toBeDefined();
  });
  
  describe('findAll', () => {
    it('should find users', async () => {
      const users = [{id: 1, name: 'test'}];

      jest.spyOn(mockDirectorService, 'findAll').mockResolvedValue(users);

      const result = await directorController.findAll();

      expect(directorService.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    })
  })

  describe('findOne', () => {
    it('should find a user', async () => {
      const user = {id: 1, name: 'test'};

      jest.spyOn(mockDirectorService, 'findOne').mockResolvedValue(user);

      const result = await directorController.findOne(1);

      expect(directorService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(user);
    })
  })

  describe('create', () => {
    it('should create a user', async () => {
      const createDirectorDto: CreateDirectorDto = {
        name: 'test',
        dob: 'no',
        nationality: 'any',
      }

      jest.spyOn(mockDirectorService, 'create').mockResolvedValue(createDirectorDto);

      const result = await directorController.create(createDirectorDto);

      expect(directorService.create).toHaveBeenCalledWith(createDirectorDto);
      expect(result).toEqual(createDirectorDto);
    })
  })

  describe('update', () => {
    it('should update a user', async () => {
      const updateDirectorDto: UpdateDirectorDto = {
        name: 'test2'
      }
      const newUser = {id: 1, name: updateDirectorDto.name};

      jest.spyOn(mockDirectorService, 'update').mockResolvedValue(newUser);

      const result = await directorController.update(1, updateDirectorDto);

      expect(directorService.update).toHaveBeenCalledWith(1, updateDirectorDto);
      expect(result).toEqual(newUser);
    })
  })

  describe('remove', () => {
    it('should remove a user', async () => {
      const id = 1;

      jest.spyOn(mockDirectorService, 'remove').mockResolvedValue(id);

      const result = await directorController.remove(id);

      expect(directorService.remove).toHaveBeenCalledWith(id);
      expect(result).toEqual(id);
    })
  })
});

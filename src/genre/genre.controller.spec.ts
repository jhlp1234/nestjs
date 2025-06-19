import { Test, TestingModule } from '@nestjs/testing';
import { GenreController } from './genre.controller';
import { GenreService } from './genre.service';
import { CreateGenreDto } from './dto/create-genre.dto';
import { Genre } from './entities/genre.entity';
import { UpdateGenreDto } from './dto/update-genre.dto';

const mockGenreService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}

describe('GenreController', () => {
  let controller: GenreController;
  let service: GenreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenreController],
      providers: [
        {
          provide: GenreService,
          useValue: mockGenreService,
        }
      ],
    }).compile();

    controller = module.get<GenreController>(GenreController);
    service = module.get<GenreService>(GenreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a genre', async () => {
      const createGenreDto: CreateGenreDto = {name: 'sad'};
      const createdGenre = {id: 1, name: 'sad'};

      jest.spyOn(service, 'create').mockResolvedValue(createdGenre as CreateGenreDto & Genre);

      expect(controller.create(createGenreDto)).resolves.toEqual(createdGenre);
      expect(service.create).toHaveBeenCalledWith(createGenreDto);
    })
  })

  describe('findAll', () => {
    it('should find genres', async () => {
      const genres = [{id: 1, name: 'funny'}];

      jest.spyOn(service, 'findAll').mockResolvedValue(genres as Genre[]);

      expect(controller.findAll()).resolves.toEqual(genres);
      expect(service.findAll).toHaveBeenCalled();
    })
  })

  describe('findOne', () => {
    it('should find a genre', async () => {
      const id = 1;
      const genre = {id: 1, name: 'sad'};

      jest.spyOn(service, 'findOne').mockResolvedValue(genre as Genre);

      expect(controller.findOne(id)).resolves.toEqual(genre);
      expect(service.findOne).toHaveBeenCalledWith(id);
    })
  })

  describe('update', () => {
    it('should update a genre', async () => {
      const updateGenreDto: UpdateGenreDto = {name: 'funny'};
      const updatedGenre = {id: 1, name: 'funny'};

      jest.spyOn(service, 'update').mockResolvedValue(updatedGenre as Genre);

      expect(controller.update(1, updateGenreDto)).resolves.toEqual(updatedGenre);
      expect(service.update).toHaveBeenCalledWith(1, updateGenreDto);
    })
  })

  describe('remove', () => {
    it('should remove a genre', async () => {
      const id = 1;

      jest.spyOn(service, 'remove').mockResolvedValue(id);

      expect(controller.remove(id)).resolves.toBe(id);
      expect(service.remove).toHaveBeenCalledWith(id);
    })
  })
});

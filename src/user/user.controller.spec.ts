import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

const mockedUserService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockedUserService
        }
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should return correct value', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@gmail.com',
        password: '1234',
      }

      const user = {id: 1, ...createUserDto, password: '12345'};

      jest.spyOn(service, 'create').mockResolvedValue(user as User);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(user);
    })
  })

  describe('findAll', () => {
    it('should return users', async () => {
      const users = [
        {id: 1, email: 'test@gmail.com'},
        {id: 2, email: 'test2@gmail.com'}
      ]

      jest.spyOn(service, 'findAll').mockResolvedValue(users as User[]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    })

    describe('findOne', () => {
      it('should return single user', async () => {
        const user = {id: 1, email: 'test@gmail.com'};

        jest.spyOn(service, 'findOne').mockResolvedValue(user as User);

        const result = await controller.findOne("1");

        expect(service.findOne).toHaveBeenCalledWith(1);
        expect(result).toEqual(user);
      })
    })

    describe('update', () => {
      it('should return updated user', async () => {
        const updateUserDto: UpdateUserDto = {
          email: 'test@gmail.com'
        }

        const user = {id: 1, ...updateUserDto};

        jest.spyOn(service, 'update').mockResolvedValue(user as User);

        const result = await controller.update("1", updateUserDto);

        expect(service.update).toHaveBeenCalledWith(user.id, updateUserDto);
        expect(result).toEqual(user);
      })
    })

    describe('remove', () => {
      it('should return removed user id', async () => {
        const user = {id: 1, email: 'test@gmail.com'};

        jest.spyOn(service, 'remove').mockResolvedValue(user.id);

        const result = await controller.remove("1");

        expect(service.remove).toHaveBeenCalledWith(user.id);
        expect(result).toEqual(user.id);
      })
    })
  })
});

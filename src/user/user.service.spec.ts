import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

const mockCofngiService = {
  get: jest.fn(),
}

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository
        },
        {
          provide: ConfigService,
          useValue: mockCofngiService
        }
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it('should create a new user and return it', async () => {
      const createUserDto: CreateUserDto = {
        email: "jhlp@gmail.com",
        password: "1234",
      }

      const hashRounds = 10;
      const hashedPassword = "hashPassword";
      const result = {
        id: 1,
        email: createUserDto.email,
        password: hashedPassword
      }

      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(mockCofngiService, 'get').mockReturnValue(hashRounds);
      jest.spyOn(bcrypt, 'hash').mockImplementation((password, hashRound) => hashedPassword);
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValueOnce(result)

      const createdUser = await service.create(createUserDto);

      expect(createdUser).toEqual(result);
      expect(mockUserRepository.findOne).toHaveBeenNthCalledWith(1, {where: {email: createUserDto.email}});
      expect(mockUserRepository.findOne).toHaveBeenNthCalledWith(2, {where: {email: createUserDto.email}});
      expect(mockCofngiService.get).toHaveBeenCalledWith(expect.anything());
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, hashRounds);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        email: createUserDto.email,
        password: hashedPassword,
      })
    })

    it('should throw BadRequestException', async () => {
      const createUserDto: CreateUserDto = {
        email: "jhlp@gmail.com",
        password: "1234",
      }

      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue({id: 1, email: createUserDto.email});
      
      expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({where: {email: createUserDto.email}});
    })
  })

  describe("findAll", () => {
    it('should return all users', async () => {
      const users = [
        {id: 1, email: "test@gmail.com"}
      ];

      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockUserRepository.find).toHaveBeenCalled();
    })
  })

  describe("findOne", () => {
    it("should return a user by id", async () => {
      const user = {id: 1, email: "test@gmail.com"};

      //mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(mockUserRepository, "findOne").mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(result).toEqual(user);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({where: {id: 1}});
    })

    it('should throw a NotFoundException', async () => {
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);

      expect(service.findOne(100)).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({where: {id: 100}});
    })
  })

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        email: "test@gmail.com",
        password: "12345"
      }
      const hashRounds = 10;
      const hashedPassword = "hashed12345";
      const user = {id: 1, email: updateUserDto.email};

      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValueOnce(user);
      jest.spyOn(mockCofngiService, 'get').mockReturnValue(hashRounds);
      jest.spyOn(bcrypt, 'hash').mockImplementation((password, hashRound) => hashedPassword);
      jest.spyOn(mockUserRepository, 'update').mockResolvedValue(undefined);
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValueOnce({...user, password: hashedPassword});
      
      const updatedUser = await service.update(user.id, updateUserDto);

      expect(updatedUser).toEqual({...user, password: hashedPassword});
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({where: {id: 1}});
      expect(mockCofngiService.get).toHaveBeenCalledWith(expect.anything());
      expect(bcrypt.hash).toHaveBeenCalledWith(updateUserDto.password, hashRounds);
      expect(mockUserRepository.update).toHaveBeenCalledWith({id: user.id}, {...updateUserDto, password: hashedPassword});
    })

    it('should throw a NotFoundException', async () => {
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);

      const updateUserDto: UpdateUserDto = {
        email: "test@gmail.com",
        password: "12345"
      }      

      const user = {id: 1, email: updateUserDto.email};

      expect(service.update(user.id, updateUserDto)).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({where: {id: 1}});
      expect(mockUserRepository.update).not.toHaveBeenCalledWith();
    })
  })

  describe("remove", () => {
    it('should delete a user', async () => {
      const id = 100;

      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue({id: 10});

      const result = await service.remove(id);

      expect(result).toEqual(id);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({where: {id: 100}});
    })

    it('should throw a NotFoundException', async () => {
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);

      expect(service.remove(100)).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({where: {id: 100}});
    })
  })
});

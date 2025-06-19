import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { Role, User } from 'src/user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from 'src/user/user.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockUserRepository = {
  save: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
}

const mockConfigService = {
  get: jest.fn(),
}

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
  decode: jest.fn(),
}

const mockCacheManager = {
  set: jest.fn(),
}

const mockUserService = {
  create: jest.fn(),
}

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: Repository<User>;
  let configService: ConfigService;
  let jwtService: JwtService;
  let cacheManager: Cache;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        }
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    configService = module.get<ConfigService>(ConfigService);
    jwtService = module.get<JwtService>(JwtService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('tokenBlock', () => {
    it('should block token', async () => {
      const token = 'token';
      const payload = {
        exp: (Math.floor(Date.now() / 1000)) + 60
      }

      jest.spyOn(jwtService, 'decode').mockReturnValue(payload);

      await authService.blockToken(token);

      expect(jwtService.decode).toHaveBeenCalledWith(token);
      expect(cacheManager.set).toHaveBeenCalledWith(`Block_${token}`, payload, expect.any(Number));
    })
  })

  describe('parseBasicToken', () => {
    it('should return devided token', async () => {
      const rawToken = 'Basic dGVzdEBnbWFpbC5jb206MTIzNA==';
      const result = authService.parseBasicToken(rawToken);

      const decoded = {email: 'test@gmail.com', password: '1234'};

      expect(result).toEqual(decoded);
    })

    it('should throw an error for invalid token format', async () => {
      const rawToken = 'InvalidToken';

      expect(() => authService.parseBasicToken(rawToken)).toThrow(BadRequestException);
    })

    it('should throw an error for invalid token format', async () => {
      const rawToken = 'Bearer InvalidToken';

      expect(() => authService.parseBasicToken(rawToken)).toThrow(BadRequestException);
    })

    it('should throw an error for invalid token format', async () => {
      const rawToken = 'Basic a';

      expect(() => authService.parseBasicToken(rawToken)).toThrow(BadRequestException);
    })
  })

  describe('parseBearerToken', () => {
    it('should parse valid bearer token', async () => {
      const token = "Bearer token";
      const payload = {type: 'access'};

      jest.spyOn(configService, 'get').mockReturnValue('secret');
      jest.spyOn(mockJwtService, 'verifyAsync').mockResolvedValue(payload);

      const result = await authService.parseBearerToken(token, false);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', {secret: 'secret'});
      expect(result).toEqual(payload);
    })

    it('should throw an error for invalid token', async () => {
      const rawToken = 'a';

      expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(BadRequestException);
    })

    it('should throw an error for token not starting with Bearer', async () => {
      const rawToken = 'Basic a';

      expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(BadRequestException);
    })

    it('should throw an error if payload.type is not refresh', async () => {
      const rawToken = 'Bearer a';

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({type: 'refresh'});

      expect(authService.parseBearerToken(rawToken, false)).rejects.toThrow(UnauthorizedException);
    })

    it('should throw an error if payload.type is not refresh', async () => {
      const rawToken = 'Bearer a';

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({type: 'access'});

      expect(authService.parseBearerToken(rawToken, true)).rejects.toThrow(UnauthorizedException);
    })
  })

  describe('register', () => {
    it('should return registered user', async () => {
      const rawToken = 'Basic dGVzdEBnbWFpbC5jb206MTIzNA==';
      const user = {email: 'test@gmail.com', password: '1234'};

      jest.spyOn(authService, 'parseBasicToken').mockReturnValue(user);
      jest.spyOn(mockUserService, 'create').mockResolvedValue(user);

      const result = await authService.register(rawToken);

      expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken);
      expect(userService.create).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    })
  })

  describe('authenticate', () => {
    it('should return authenticated user', async () => {
      const email = 'test@gmail.com';
      const password = '1234';
      const user = {email, password: 'hashedPassword'};

      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation((a, b) => true);

      const result = await authService.authenticate('test@gmail.com', '1234');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({where: {email: 'test@gmail.com'}});
      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashedPassword');
      expect(result).toEqual(user);
    })

    it('should throw error for no user', async () => {
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);

      expect(authService.authenticate('test@gmail.com', '1234')).rejects.toThrow(BadRequestException);
    })

    it('should throw error for invalid password', async () => {
      const user = {email: 'test@gmail.com', password: 'hashedPassword'};
      
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation((a, b) => false);

      expect(authService.authenticate('test@gmail.com', '1234')).rejects.toThrow(BadRequestException);
    })
  })

  describe('issueToken', () => {
    const user = {id: 1, role: Role.user};
    const token = 'token';

    beforeEach(() => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue('secret');
      jest.spyOn(mockJwtService, 'signAsync').mockResolvedValue(token);
    })

    it('should return access token', async () => {
      const result = await authService.issueToken(user, false);

      expect(jwtService.signAsync).toHaveBeenCalledWith({sub: 1, role: user.role, type: 'access'}, {secret: 'secret', expiresIn: 300});
      expect(result).toBe(token);
    })

    it('should return refresh token', async () => {
      const result = await authService.issueToken(user, true);

      expect(jwtService.signAsync).toHaveBeenCalledWith({sub: 1, role: user.role, type: 'refresh'}, {secret: 'secret', expiresIn: '24h'});
      expect(result).toBe(token);
    })
  })

  describe('login', () => {
    it('should login user', async () => {
      const rawToken = 'Basic airseiuhare';
      const email = 'test@gmail.com';
      const password = '1234';
      const user = {id: 1, role: Role.user};

      jest.spyOn(authService, 'parseBasicToken').mockReturnValue({email, password});
      jest.spyOn(authService, 'authenticate').mockResolvedValue(user as User);
      jest.spyOn(authService, 'issueToken').mockResolvedValue('token');
      
      const result = await authService.login(rawToken);

      expect(authService.parseBasicToken).toHaveBeenCalledWith(rawToken);
      expect(authService.authenticate).toHaveBeenCalledWith(email, password);
      expect(authService.issueToken).toHaveBeenCalledTimes(2);
      expect(result).toEqual({refreshToken: 'token', accessToken: 'token'});
    })
  })
});

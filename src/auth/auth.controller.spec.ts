import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role, User } from 'src/user/entities/user.entity';

const mockAuthService = {
  blockToken: jest.fn(),
  parseBasicToken: jest.fn(),
  parseBearerToken: jest.fn(),
  register: jest.fn(),
  authenticate: jest.fn(),
  issueToken: jest.fn(),
  login: jest.fn(),
}

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        }
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  })

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('registerUser', () => {
    it('should register a user', async () => {
      const token = 'token';
      const result = {id: 1, email: 'test@gmail.com', password: '1234'};

      jest.spyOn(authService, 'register').mockResolvedValue(result as User);

      expect(authController.registerUser(token)).resolves.toEqual(result);
      expect(authService.register).toHaveBeenCalledWith(token);
    })
  })
  
  describe('loginUser', () => {
    it('should login a user', async () => {
      const token = 'token';
      const result = {refreshToken: 'refreshToken', accessToken: 'accessToken'};

      jest.spyOn(authService, 'login').mockResolvedValue(result);

      expect(authController.loginUser(token)).resolves.toEqual(result);
      expect(authService.login).toHaveBeenCalledWith(token);
    })
  })

  describe('blockToken', () => {
    it('should block a token', async () => {
      const token = 'token';

      jest.spyOn(authService, 'blockToken').mockResolvedValue(true);
  
      expect(authController.blockToken(token)).resolves.toBe(true);
      expect(authService.blockToken).toHaveBeenCalledWith(token);
    })
  })

  describe('rotateAccessToken', () => {
    it('should rotate access a token', async () => {
      const token = 'accessToken';

      jest.spyOn(authService, 'issueToken').mockResolvedValue(token);

      const result = await authController.rotateAccesstoken({user: 'a'});

      expect(result).toEqual({accessToken: token})
      expect(authService.issueToken).toHaveBeenCalledWith('a', false);
    })
  })

  describe('loginUserPassport', () => {
    it('should login with passport', async () => {
      const req = {user: 'test'};
      const refreshToken = 'ref';
      const accessToken = 'acc';

      jest.spyOn(authService, 'issueToken').mockResolvedValueOnce(refreshToken)
      .mockResolvedValueOnce(accessToken);

      const result = await authController.loginUserPassport(req);

      expect(authService.issueToken).toHaveBeenCalledTimes(2);
      expect(authService.issueToken).toHaveBeenNthCalledWith(1, 'test', true);
      expect(authService.issueToken).toHaveBeenNthCalledWith(2, 'test', false);
      expect(result).toEqual({refreshToken, accessToken});
    })
  })
});

import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role, User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { envVariables } from 'src/common/const/env.const';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async blockToken(token: string){
    const payload = this.jwtService.decode(token);

    const expiryDate = +new Date(payload['exp'] * 1000);
    const now = Date.now();

    const diffSec = (expiryDate - now) / 1000;

    await this.cacheManager.set(`Block_${token}`, payload, Math.max(diffSec * 1000, 1));

    return true;
  }

  parseBasicToken(rawToken: string) {
    const basicSplit = rawToken.split(' ');
    if(basicSplit.length !== 2) throw new BadRequestException('잘못된 입력');

    const [basic, token] = basicSplit;
    if(basic.toLowerCase() !== 'basic') throw new BadRequestException('잘못된 입력');

    const decoded = Buffer.from(token, 'base64').toString('utf-8');

    const tokenSplit = decoded.split(':');
    if(tokenSplit.length !== 2) throw new BadRequestException('잘못된 토큰');

    const [email, password] = tokenSplit;

    return {email, password};
  }

  async parseBearerToken(rawToken: string, isRefreshToken: boolean){
    const bearerSplit = rawToken.split(' ');
    if(bearerSplit.length !== 2) throw new BadRequestException('잘못된 입력');

    const [bearer, token] = bearerSplit;
    if(bearer.toLowerCase() !== 'bearer') throw new BadRequestException('잘못된 입력');

    try {
      const payload = await this.jwtService.verifyAsync(token, {secret: this.configService.get<string>(isRefreshToken ? envVariables.refreshTokenSecret : envVariables.accessTokenSecret)});

    if(isRefreshToken){
      if(payload.type !== 'refresh') throw new BadRequestException('Refresh 토큰 입력');
    } else{
      if(payload.type !== 'access') throw new BadRequestException('Access 토큰 입력');
    }

    return payload;
    } catch (error) {
      throw new UnauthorizedException('토큰 만료');
    }
  }

  async register(rawToken: string) {
    const {email, password} = this.parseBasicToken(rawToken);

    // const user = await this.userRepository.findOne({where: {email}});
    // if(user) throw new BadRequestException('존재하는 유저');

    return this.userService.create({email, password});
  }

  async authenticate(email: string, password: string){
    const user = await this.userRepository.findOne({where: {email}});
    if(!user) throw new BadRequestException('없는 유저');

    const passOk = await bcrypt.compare(password, user.password);
    if(!passOk) throw new BadRequestException('잘못된 정보');

    return user;
  }

  async issueToken(user: {id: number, role: Role}, isRefreshToken: boolean){
    const refreshTokenSecret = this.configService.get<string>(envVariables.refreshTokenSecret);
    const accessTokenSecret = this.configService.get<string>(envVariables.accessTokenSecret);

    return this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      type: isRefreshToken ? 'refresh' : 'access',
    }, {
      secret: isRefreshToken ? refreshTokenSecret : accessTokenSecret,
      expiresIn: isRefreshToken ? '24h' : 300
    })
  }

  async login(rawToken: string) {
    const {email, password} = this.parseBasicToken(rawToken);

    const user = await this.authenticate(email, password);

    return {
      refreshToken: await this.issueToken(user, true),
      accessToken: await this.issueToken(user, false)
    };
  }
}

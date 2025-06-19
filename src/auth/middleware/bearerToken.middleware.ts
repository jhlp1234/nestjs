import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { BadRequestException, ForbiddenException, Inject, Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { NextFunction, Request, Response } from "express";
import { envVariables } from "src/common/const/env.const";

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache
  ){}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];

    if(!authHeader){
      next();
      return;
    }

    const token = this.validateBearerToken(authHeader);

    const blockedToken = await this.cacheManager.get(`Block_${token}`);
    if(blockedToken) throw new ForbiddenException('차단된 토큰');

    const cachedPayload = await this.cacheManager.get(`Token_${token}`);
    if(cachedPayload){
      console.log('cache');
      req.user = cachedPayload;
      return next();
    }

    const decodedPayload = this.jwtService.decode(token);

    try {

      const secretKey = decodedPayload.type === 'refresh' ? envVariables.refreshTokenSecret : envVariables.accessTokenSecret;

      const payload = await this.jwtService.verifyAsync(token, {secret: this.configService.get<string>(secretKey)});

      const expiryDate = +new Date(payload['exp'] * 1000);
      const now = Date.now();

      const diffSec = (expiryDate - now) / 1000;

      await this.cacheManager.set(`Token_${token}`, payload, Math.max((diffSec - 30) * 1000, 1));

      req.user = payload;

      next();
    } catch (error) {
      next();
    }
  }

  validateBearerToken(rawToken: string){
    const bearerSplit = rawToken.split(' ');
    if(bearerSplit.length !== 2) throw new BadRequestException('잘못된 입력');

    const [bearer, token] = bearerSplit;
    if(bearer.toLowerCase() !== 'bearer') throw new BadRequestException('잘못된 입력');
  
    return token;
  }  
}
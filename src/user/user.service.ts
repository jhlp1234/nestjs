import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { envVariables } from 'src/common/const/env.const';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const {email, password} = createUserDto;

    const user = await this.userRepository.findOne({where: {email}});
    if(user) throw new BadRequestException('존재하는 유저');

    const hash = await bcrypt.hash(password, this.configService.get<number>(envVariables.hashRounds) as number);

    await this.userRepository.save({email, password: hash});

    return this.userRepository.findOne({where: {email}});
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({where: {id}});
    if(!user) throw new NotFoundException('없는 유저');

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const {password} = updateUserDto;

    const user = await this.userRepository.findOne({where: {id}});
    if(!user) throw new NotFoundException('없는 유저');

    const hash = await bcrypt.hash(password as string, this.configService.get<number>(envVariables.hashRounds) as number);

    await this.userRepository.update({id}, {...updateUserDto, password: hash});

    return this.userRepository.findOne({where: {id}});
  }

  async remove(id: number) {
    const user = await this.userRepository.findOne({where: {id}});
    if(!user) throw new NotFoundException('없는 유저');

    await this.userRepository.delete(id);

    return id;
  }
}

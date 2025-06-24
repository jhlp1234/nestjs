import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import { PagePaginationDto } from "./dto/page-pagination.dto";
import { CursorPaginationDto } from "./dto/cursor-pagination.dto";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ObjectCannedACL, PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import {v4 as Uuid} from 'uuid';
import { ConfigService } from "@nestjs/config";
import { envVariables } from "./const/env.const";
import { join, posix } from "path";

@Injectable()
export class CommonService {
  private s3: S3;

  constructor(
    private readonly configService: ConfigService,
  ){
    this.s3 = new S3({
      credentials: {
        accessKeyId: configService.get<string>(envVariables.awsAccessKeyId) as string,
        secretAccessKey: configService.get<string>(envVariables.awsSecretAccessKey) as string,
      },

      region: configService.get<string>(envVariables.awsRegion),
    });
  }

  async saveMovieToPermanentStorage(fileName: string){
    try {
      const bucketName = this.configService.get<string>(envVariables.bucketName) as string;
      await this.s3.copyObject({
        Bucket: bucketName,
        CopySource: `${bucketName}/public/temp/${fileName}`,
        Key: join('public', 'movie', fileName),
        ACL: 'public-read',
      });

      await this.s3.deleteObject({
        Bucket: bucketName,
        Key: `public/temp/${fileName}`,
      });
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException('s3 에러');
    }
  }

  async createPresignedUrl(){
    const params = {
      Bucket: this.configService.get<string>(envVariables.bucketName),
      Key: `public/temp/${Uuid()}.mp4`,
      ACL: ObjectCannedACL.public_read,
    }

    try {
      const url = await getSignedUrl(this.s3, new PutObjectCommand(params), {
        expiresIn: 300,
      });

      return url;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('S3 실패');
    }
  }

  applyPagePaginationParamsToQb<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, dto: PagePaginationDto){
    const {page, take} = dto;

    const skip = (page - 1) * take;

    qb.take(take);
    qb.skip(skip);
  }

  async applyCursorPaginationParamsToQb<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>, dto: CursorPaginationDto){
    let {order, cursor, take} = dto;

    if(cursor){
      const decodeCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      const cursorObj = JSON.parse(decodeCursor);

      order = cursorObj.order;

      const {values} = cursorObj;

      const columns = Object.keys(values);
      const comparisonOperator = order.some((o) => o.endsWith('DESC')) ? '<' : '>';
      const whereConditions = columns.map(c => `${qb.alias}.${c}`).join(',');
      const whereParams = columns.map(c => `:${c}`).join(',');

      //qb.where(`(${whereConditions}) ${comparisonOperator} (${whereParams})`, values);
      
      //qb.where(`${qb.alias}.${columns[0]} < ${values[columns[0]]} or (${qb.alias}.${columns[0]} = ${values[columns[0]]} and ${qb.alias}.${columns[1]} > ${values[columns[1]]})`)
      for(let i = 0; i < columns.length; i++){
        const condition = order[i].endsWith('DESC') ? '<' : '>';

        if(i === 0){
          qb.where(`${qb.alias}.${columns[i]} ${condition} ${values[columns[i]]}`);
          continue;
        }

        qb.orWhere(`${qb.alias}.${columns[i - 1]} = ${values[columns[i - 1]]} and ${qb.alias}.${columns[i]} ${condition} ${values[columns[i]]}`);
      }
    }

    // [id_DESC, likeCount_DESC]
    for(let i = 0; i < order.length; i++){
      const [column, direction] = order[i].split('_');

      if(direction !== 'ASC' && direction !== 'DESC') throw new BadRequestException('잘못된 오더');
    
      if(i === 0){
        qb.orderBy(`${qb.alias}.${column}`, direction);
      } else{
        qb.addOrderBy(`${qb.alias}.${column}`, direction)
      }
    }

    // if(cursor){
    //   const direction = order === 'ASC' ? '>' : '<';
    //   // order => ASC : movie.id > :id
    //   qb.where(`${qb.alias}.id ${direction} :id`, {id});
    // }
    // qb.orderBy(`${qb.alias}.id`, order);
    qb.take(take);

    const results = await qb.getMany();

    const nextCursor = this.generateNextCursor(results, order);

    return {qb, nextCursor};
  }

  generateNextCursor<T>(results: T[], order: string[]): string | null {
    if(results.length === 0) return null;

    const lastItme = results[results.length - 1];
    const values = {};

    order.forEach((columnOrder) => {
      const [column] = columnOrder.split('_');
      values[column] = lastItme[column];
    })

    const cursorObj = {values, order};
    const nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');

    return nextCursor;
  }
}
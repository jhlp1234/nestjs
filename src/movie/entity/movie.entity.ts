import { Exclude, Expose, Transform } from 'class-transformer';
import { ChildEntity, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, TableInheritance, UpdateDateColumn, VersionColumn } from 'typeorm';
import { BaseTable } from '../../common/entity/base-table.entity';
import { MovieDetail } from './movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entities/genre.entity';
import { User } from 'src/user/entities/user.entity';
import { MovieUserLike } from './movie-user-like.entity';

@Entity()
export class Movie extends BaseTable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.createdMovies)
  creator: User;

  @Column({unique: true})
  title: string;

  @Column({default: 0})
  likeCount: number;

  @Column({default: 0})
  disLikeCount: number;

  @OneToOne(() => MovieDetail, movieDetail => movieDetail.id, {cascade: true, nullable: false})
  @JoinColumn()
  detail: MovieDetail;

  @Column()
  @Transform(({value}) => {
    console.log(value);
    return `http://localhost:3000/${value}`
  })
  movieFilePath: string;

  @ManyToOne(() => Director, director => director.id, {cascade: true, nullable: false})
  director: Director;

  @ManyToMany(() => Genre, genre => genre.movies, {cascade: true, nullable: false})
  @JoinTable()
  genres: Genre[]

  @OneToMany(() => MovieUserLike, (mul) => mul.movie)
  likedUsers: MovieUserLike[];
}

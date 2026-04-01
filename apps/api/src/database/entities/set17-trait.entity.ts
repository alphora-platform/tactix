import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('set17_traits')
@Index(['setNumber'])
export class Set17Trait {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'api_name', unique: true })
  apiName!: string;

  @Column({ name: 'display_name' })
  displayName!: string;

  @Column({ name: 'trait_type' })
  traitType!: string;

  @Column({ type: 'int', array: true })
  breakpoints!: number[];

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'set_number', type: 'int', default: 17 })
  setNumber!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

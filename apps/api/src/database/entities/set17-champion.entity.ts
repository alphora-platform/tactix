import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('set17_champions')
@Index(['cost'])
@Index(['setNumber'])
export class Set17Champion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'api_name', unique: true })
  apiName!: string;

  @Column({ name: 'display_name' })
  displayName!: string;

  @Column({ type: 'int' })
  cost!: number;

  @Column({ type: 'text', array: true })
  traits!: string[];

  @Column()
  role!: string;

  @Column({ name: 'dmg_type' })
  dmgType!: string;

  @Column({ name: 'row_position' })
  rowPosition!: string;

  @Column({ name: 'set_number', type: 'int', default: 17 })
  setNumber!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

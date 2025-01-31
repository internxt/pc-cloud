import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('hashed_files')
export class ScannedItem {
  @PrimaryColumn({ nullable: false, unique: true })
  id!: string;

  @Column({ nullable: true, default: '' })
  type!: string;

  @Column({ nullable: false })
  size!: number;

  @Column({ nullable: true })
  hash?: string;

  @Column({ nullable: false })
  createdAt!: string;

  @Column({ nullable: false })
  updatedAt!: string;

  @Column({ nullable: false })
  creationTimeW!: string;

  @Column({ nullable: false })
  updatedAtW!: string;

  @Column({ nullable: false })
  pathName!: string;

  @Column({ nullable: false })
  status!: 'scanned' | 'pending';

  @Column({ nullable: false })
  isInfected!: boolean;
}

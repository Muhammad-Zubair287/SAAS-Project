import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly rounds: number;

  constructor(config: ConfigService) {
    this.rounds = config.getOrThrow<number>('auth.bcryptRounds');
  }

  async hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, this.rounds);
  }

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}

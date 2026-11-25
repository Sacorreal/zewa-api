import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { normalizeEmail } from '../../utils/email';
import { User, UserStatus } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: normalizeEmail(email) });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  /**
   * Reutiliza la identidad si el correo ya existe (una persona puede
   * administrar varios conjuntos); si no, la crea pendiente y sin contraseña.
   * `orIgnore` + relectura evita duplicados ante solicitudes concurrentes.
   */
  async findOrCreatePending(
    email: string,
    manager: EntityManager,
  ): Promise<User> {
    const normalized = normalizeEmail(email);
    const repository = manager.getRepository(User);

    await repository
      .createQueryBuilder()
      .insert()
      .values({ email: normalized, status: UserStatus.PendingActivation })
      .orIgnore()
      .execute();

    return repository.findOneByOrFail({ email: normalized });
  }

  async registerFailedLogin(
    user: User,
    maxAttempts: number,
    lockoutMinutes: number,
  ): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= maxAttempts;
    await this.users.update(user.id, {
      failedLoginAttempts: locked ? 0 : attempts,
      lockedUntil: locked
        ? new Date(Date.now() + lockoutMinutes * 60_000)
        : user.lockedUntil,
    });
  }

  async resetFailedLogins(user: User): Promise<void> {
    if (user.failedLoginAttempts === 0 && user.lockedUntil === null) return;
    await this.users.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }
}

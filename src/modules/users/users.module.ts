import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipRole } from './entities/membership-role.entity';
import { Membership } from './entities/membership.entity';
import { User } from './entities/user.entity';
import { MembershipsService } from './memberships.service';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Membership, MembershipRole])],
  providers: [UsersService, MembershipsService],
  exports: [UsersService, MembershipsService],
})
export class UsersModule {}
